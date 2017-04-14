import chai from 'chai';
import { schema } from 'normalizr';
import { bindNormalizedGet } from '../src/index';
import { articlesCommentsUsers as data } from './fixtures';

const { expect } = chai;

const makeSchemas = () => {
  const users = new schema.Entity('users');
  const comments = new schema.Entity('comments', {
    user: users,
  });
  const articles = new schema.Entity('articles', {
    author: users,
    comments: [comments],
  });
  return { comments, articles, users };
};

describe('Normalized Get', () => {
  const nget = bindNormalizedGet(makeSchemas());

  it('should find a top-level model', () => {
    const actual = nget(data, 'articles[123]');
    expect(actual.id).to.equal('123');
  });

  it('should return undefined for entities not in data', () => {
    const actual = nget(data, 'articles[9999999]');
    expect(actual).to.be.undefined;
  });

  it('should return resolved entities for 1-to-many relationships', () => {
    const actual = nget(data, 'articles[123].comments');
    const expected = [data.comments['comment-123-4738'], data.comments['comment-123-9999']]
    expect(actual).to.include.members(expected);
  });

  it('should return resolved entities for 1-to-1 relationships', () => {
    const actual = nget(data, 'comments[comment-123-9999].user');  
    expect(actual).to.equal(data.users['8472'])
  });

  it('should access resolved entities by index', () => {
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
    const fn = () => { nget(data, 'articles[123].nonExistantRelation'); };
    expect(fn).to.throw('Could not find property \'nonExistantRelation\' on \'articles\' for path [articles, 123, nonExistantRelation]. Available properties: [author,body,comments,id,title]');
  });
});
