# Normalized Get

A `get` function that traverses normalizr relationships.

## Who is this for?

Anyone that uses [normalizr](https://github.com/paularmstrong/normalizr), or normalized data that conforms to it.

## What does it do?

Let's you access normalized data as though it was denormalized. 

Say you have a schema like this:
```js
  const users = new schema.Entity('users');
  const articles = new schema.Entity('articles', {
    author: users
  });
  const schemas { articles, users };
```

Before, to access a related property, you'd have to do this:
```js
const authorId = data.articles[123].author;
const author = data.users[authorId];
```

The more relationships your data has have the more complex this gets. And you have to remember which property maps to which model. In this case, `articles[123].author` maps to `users`.

With normalized get you can access a relationship like:

```js
const nget = bindNormalizedGet(schemas);
const author = nget(data, 'articles[123].author');
```

## Usage

First bind your schemas. This makes it easy to use Normalized Get without passing schemas in each time. Probably best to do this somewhere central in your project and export the bound getter.

```js
export const nget = bindNormalizedGet(schemas);
```

Now you can have an `nget` function that takes data and a path.
