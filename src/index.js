import lodashGet from 'lodash.get';
import lodashMerge from 'lodash.merge';
import memoize from 'lodash.memoize';
import stringToPath from 'lodash._stringtopath';

const nget = (config, schemas, entities, path) => {
  const [modelName, id, propertyName, ...remainingPath] = path;
  const modelData = entities[modelName] && entities[modelName][id];
  const { shouldFollow } = config;
  if (!propertyName) {
    return modelData;
  } // No more properties to find. We're done.

  if (typeof modelData === 'undefined') {
    return undefined;
  } // cache miss. Ignore.

  const schema = schemas[modelName];
  if (typeof schema === 'undefined') {
    throw new Error(
      `Could not find schema '${modelName}' for path [${path.join(', ')}]. Availalbe schemas: [${Object.keys(schemas)}]`,
    );
  }

  const propertyData = modelData[propertyName]; // may be an array or value
  if (typeof propertyData === 'undefined') {
    throw new Error(
      `Could not find property '${propertyName}' on '${modelName}' for path [${path.join(', ')}]. Available properties: [${Object.keys(modelData)}]`,
    );
  }

  const propertySchema = schema.schema[propertyName];

  // it's a normal non-relational property, defer to lodashGet
  if (!propertySchema) {
    return (
      !propertySchema && lodashGet(modelData, [propertyName, ...remainingPath])
    );
  }

  // it's a hasMany relationship
  if (Array.isArray(propertySchema)) {
    const relatedModelsName = propertySchema[0].key;
    // access related entity by key if provided
    if (remainingPath.length && !shouldFollow) {
      throw new Error(
        "[TBD: error about there being a remaining path but shouldFollow isn't configured]",
      );
    }
    // return all the related records
    return propertyData.map(relatedId =>
      nget(config, schemas, entities, [
        relatedModelsName,
        relatedId,
        ...remainingPath,
      ]),
    );
  }

  // it's a belongsTo relationship
  const relatedModelName = propertySchema.key;
  return nget(config, schemas, entities, [
    relatedModelName,
    propertyData,
    ...remainingPath,
  ]);
};

export const parsedNGet = (config = {}, schemas, entities, pathString) => {
  const path = stringToPath(pathString);
  const rootModelName = path[0];
  if (typeof entities[rootModelName] === 'undefined') {
    const knownSchemas = Object.keys(schemas);
    throw new Error(
      `Could not find property '${rootModelName}' for path '${pathString}'. Known keys: [${knownSchemas.join(',')}].`,
    );
  }
  return nget(config, schemas, entities, path);
};

export const bindNormalizedGet = (schemas, config) =>
  parsedNGet.bind(null, config, schemas);

// --------------------------------------------

export const bindNormalizedGetDeep = (schemas, config) =>
  parsedNGet.bind(null, config, schemas);

const ngetDeep = (config, schemas, entities, path) => {
  const [modelName, id, propertyName, ...remainingPath] = path;
  const modelData = entities[modelName] && entities[modelName][id];
  const { shouldFollow } = config;
  if (!propertyName) {
    return modelData;
  } // No more properties to find. We're done.

  if (typeof modelData === 'undefined') {
    return undefined;
  } // cache miss. Ignore.

  const schema = schemas[modelName];
  if (typeof schema === 'undefined') {
    throw new Error(
      `Could not find schema '${modelName}' for path [${path.join(', ')}]. Availalbe schemas: [${Object.keys(schemas)}]`,
    );
  }

  const propertyData = modelData[propertyName]; // may be an array or value
  if (typeof propertyData === 'undefined') {
    throw new Error(
      `Could not find property '${propertyName}' on '${modelName}' for path [${path.join(', ')}]. Available properties: [${Object.keys(modelData)}]`,
    );
  }

  const propertySchema = schema.schema[propertyName];

  // it's a normal non-relational property, defer to lodashGet
  if (!propertySchema) {
    const subProperty =
      !propertySchema && lodashGet(modelData, [propertyName, ...remainingPath]);
    return { ...modelData, [propertyName]: subProperty };
  }

  // it's a hasMany relationship
  if (Array.isArray(propertySchema)) {
    const relatedModelsName = propertySchema[0].key;
    // access related entity by key if provided
    if (remainingPath.length && !shouldFollow) {
      throw new Error(
        "[TBD: error about there being a remaining path but shouldFollow isn't configured]",
      );
    }
    // return all the related records
    const subRecords = propertyData.map(relatedId =>
      ngetDeep(config, schemas, entities, [
        relatedModelsName,
        relatedId,
        ...remainingPath,
      ]),
    );
    return { ...modelData, [propertyName]: subRecords };
  }

  // it's a belongsTo relationship
  const relatedModelName = propertySchema.key;
  console.log('path', path);

  const subRecord = ngetDeep(config, schemas, entities, [
    relatedModelName,
    propertyData,
    ...remainingPath,
  ]); /* ?*/
  return { ...modelData, [propertyName]: subRecord };
};

// ----------------------
import { schema } from 'normalizr';
import { articlesCommentsUsers as data } from '../test/fixtures';

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

// const ngetDeep = bindNormalizedGetDeep(makeSchemas);

const results = ngetDeep(
  { shouldFollow: true },
  makeSchemas(),
  data,
  // 'articles.123.author'.split('.'),
  'articles.123.comments.user'.split('.'),
);

JSON.stringify(results); /* ?*/

// const schemas = makeSchemas();

// const mGetTestFOOOO = (config, schemas, entities, ...paths) => {
//   const denormalized = paths.map(path => {}
//     nget(config, schemas, entities, path)
//   );
//   console.log("denormalized", denormalized);
//   return lodashMerge({}, ...denormalized);
// };

// export const bindMergedGet = schemas =>
//   mGetTestFOOOO.bind(null, { shouldFollow: true }, schemas); // TODO: Obvs

// const fooMergedGet = bindMergedGet(makeSchemas());
// fooMergedGet(data, 'articles.123'.split('.')); /* ?*/
