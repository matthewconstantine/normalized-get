# Normalized Get

Helper functions for traversing [normalizr](https://github.com/paularmstrong/normalizr) relationships.

## Who is this for?

Anyone that uses [normalizr](https://github.com/paularmstrong/normalizr), or normalized data that conforms to it.

## What does it do?

1. `NormalizedGet` lets you access normalized data using a path as though it was denormalized. 
2. `GraphGet` lets you denormalize multiple paths at once, perfect for using in components.

### NormalizedGet

Say you have a schema like this:
```js
  const users = new schema.Entity('users');
  const comments = new schema.Entity('comments', {
    user: users
  });
  const articles = new schema.Entity('articles', {
    author: users,
    comments: [comments]
  });
  return { comments, articles, users };
```

Just setup `bindNoramlizedGet` like so:
```js
const normalizedGet = bindNormalizedGet(schemas, data); 
```

Now you can access deep relationships with a single line of code:

```js
// With normalizedGet
const commenters = normalizedGet('articles[123].comments.user');
```

It even follows Array entities. So the above example will map over the comments and return the authors.

For comparison, here's how you'd do it without `normalizedGet`:
```js
// Without normlaizedGet:
const commenters = Object.keys(data.comments)
  .map(key => {
    const userId = data.comments[key].user
    return data.users[userId];
  });
```

The more relationships your data has have the more complex this manual fetching gets. And you have to remember which property maps to which model.

### graphGet

`normalizedGet` is nice for getting a specific piece of data from your entity graph. What if you need more data? That's where `graphGet` comes in handy. It returns a deep structure containing the data you specify.

First we bind `graphGet` using the similar config method as before:
```js
const graphGet = bindGraphGet(schemas, data); 
```

Now we can retrieve the commenters as before, but also the article and comments too.
```js
const models = graphGet('articles[123].comments.user')
```

This will output nested data ready for use in a view:
```js
{
  articles: {
    123: {
      title: '…',
      comments: [{
        comment: 'Looks good to me', 
        user: { name: 'Jane' } 
      }, {…}, {…}]
    }
  }
}
```

`GraphGet` can accept multiple paths and merge them together.
```js
graphGet(
  `articles[${articleId}].comments.user`,
  `users[${currentUserId}]`
)
```

## Usage

First bind your schemas. This makes it easy to use the getters without passing schemas and data in each time. Probably best to do this somewhere central in your project and export the bound getter.

```js
export const normalizedGet = bindNormalizedGet(schemas, data);
export const graphGet = bindGraphGet(schemas, data);
```

Now you have `normalizedGet` and `graphGet` functions ready for easy data denormalization.