import chai from 'chai';
import { schema } from 'normalizr';
import { bindNormalizedGet, bindGraphGet } from '../src/index';
import { articlesCommentsUsers as data } from './fixtures';

const { expect } = chai;

const makeSchemas = () => {
  const users = new schema.Entity('users');
  const comments = new schema.Entity('comments', {
    user: users
  });
  const articles = new schema.Entity('articles', {
    author: users,
    comments: [comments]
  });
  return { comments, articles, users };
};

describe('Normalized Get', () => {
  const nget = bindNormalizedGet(makeSchemas());

  it('should find a top-level model', () => {
    const actual = nget(data, 'articles[123]');
    expect(actual.id).to.equal('123');
  });

  it('should return an empty object for entities not in data', () => {
    const actual = nget(data, 'articles[9999999]');
    expect(actual).to.be.undefined;
  });

  it('should return resolved entities for 1-to-many relationships', () => {
    const actual = nget(data, 'articles[123].comments');
    const expected = [
      data.comments['comment-123-4738'],
      data.comments['comment-123-9999']
    ];
    expect(actual).to.include.members(expected);
  });

  it('should return resolved entities for 1-to-1 relationships', () => {
    const actual = nget(data, 'comments[comment-123-9999].user');
    expect(actual).to.equal(data.users['8472']);
  });

  it.skip('should access resolved entities by index', () => {
    const actual = nget(data, 'articles[123].comments[0]');
    expect(actual).to.equal(data.comments['comment-123-4738']);
  });

  it('should access non-relational properties', () => {
    const actual = nget(data, 'articles[123].body');
    expect(actual).to.equal(data.articles[123].body);
  });

  it('should access chained non-relational properties', () => {
    const actual = nget(data, 'articles[123].body.length');
    expect(actual).to.equal(data.articles[123].body.length);
  });

  it('should throw an error for missing properties', () => {
    const fn = () => {
      nget(data, 'articles[123].nonExistantRelation');
    };
    expect(fn).to.throw(
      "Could not find property 'nonExistantRelation' on 'articles' for path [articles.123.nonExistantRelation]. Available properties: [author,body,comments,id,title]"
    );
  });
});

describe('Normalized Get when shouldFollow option is true', () => {
  const ngetFollow = bindNormalizedGet(makeSchemas(), { shouldFollow: true });

  it('should map over array results and apply the remaining path', () => {
    const actual = ngetFollow(data, 'articles[123].comments.comment');
    expect(actual).to.include.members(
      Object.keys(data.comments).map(key => data.comments[key].comment)
    );
  });

  it('should map over array results and apply the remaining deep path', () => {
    const actual = ngetFollow(data, 'articles[123].comments.user.name');
    const expected = Object.keys(data.comments)
      .map(key => data.comments[key])
      .map(comment => data.users[comment.user].name);
    expect(actual).to.include.members(expected);
  });
});

describe('Graph Get', () => {
  const ngetMerged = bindGraphGet(makeSchemas(), data);

  it('should return a deeply nested object', () => {
    const actual = ngetMerged('articles[123].author');
    const article = data.articles[123];
    const author = data.users[article.author];
    const expected = { ...article, ...{ author } };
    expect(actual).to.deep.equal(expected);
  });

  it('should merge multiple paths', () => {
    const actual = ngetMerged(
      'articles[123].author',
      'articles[123].comments',
      'articles[123]'
    );
    const article = data.articles[123];
    const author = data.users[article.author];
    const comments = Object.keys(data.comments).map(key => data.comments[key]);
    const expected = { ...article, ...{ author }, ...{ comments } };
    expect(actual).to.deep.equal(expected);
  });
});
