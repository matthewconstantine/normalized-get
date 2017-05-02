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
      `Could not find schema '${modelName}' for path [${path.join(', ')}]. Availalbe schemas: [${Object.keys(schemas)}]`
    );
  }

  const propertyData = modelData[propertyName]; // may be an array or value
  if (typeof propertyData === 'undefined') {
    throw new Error(
      `Could not find property '${propertyName}' on '${modelName}' for path [${path.join(', ')}]. Available properties: [${Object.keys(modelData)}]`
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
        "[TBD: error about there being a remaining path but shouldFollow isn't configured]"
      );
    }
    // return all the related records
    return propertyData.map(relatedId =>
      nget(config, schemas, entities, [
        relatedModelsName,
        relatedId,
        ...remainingPath
      ])
    );
  }

  // it's a belongsTo relationship
  const relatedModelName = propertySchema.key;
  return nget(config, schemas, entities, [
    relatedModelName,
    propertyData,
    ...remainingPath
  ]);
};

export const parsedNGet = (config = {}, schemas, entities, pathString) => {
  const path = stringToPath(pathString);
  const rootModelName = path[0];
  if (typeof entities[rootModelName] === 'undefined') {
    const knownSchemas = Object.keys(schemas);
    throw new Error(
      `Could not find property '${rootModelName}' for path '${pathString}'. Known keys: [${knownSchemas.join(',')}].`
    );
  }
  return nget(config, schemas, entities, path);
};

export const bindNormalizedGet = (schemas, config) =>
  parsedNGet.bind(null, config, schemas);

// ----------------------
// const iget = (schemas, entities, path) => {
//   const [modelName, id, propertyName, ...remainingPath] = path;
//   const modelData = entities[modelName] && entities[modelName][id];
//   if (!propertyName) { return modelData; } // No more properties to find. We're done.

//   if (typeof modelData === 'undefined') { return undefined; }  // cache miss. Ignore.

//   const schema = schemas[modelName];
//   if (typeof schema === 'undefined') {
//     throw new Error(`Could not find schema '${modelName}' for path [${path.join(', ')}]. Availalbe schemas: [${Object.keys(schemas)}]`);
//   }

//   const propertyData = modelData[propertyName];  // may be an array or value
//   if (typeof propertyData === 'undefined') {
//     throw new Error(`Could not find property '${propertyName}' on '${modelName}' for path [${path.join(', ')}]. Available properties: [${Object.keys(modelData)}]`);
//   }

//   const propertySchema = schema.schema[propertyName];

//   // it's a normal non-relational property, defer to lodashGet
//   if (!propertySchema) {
//     return !propertySchema && lodashGet(modelData, [propertyName, ...remainingPath]);
//   }

//   // it's a hasMany relationship
//   if (Array.isArray(propertySchema)) {
//     const relatedModelsName = propertySchema[0].key;
//     if (remainingPath.length) {
//       const [pathHead, ...pathTail] = remainingPath;
//       const relatedModelsIdByIndex = propertyData[pathHead];
//       return iget(schemas, entities, [relatedModelsName, relatedModelsIdByIndex, ...pathTail]);
//     }

//     // return all the related records
//     const denormalizedData = propertyData.map((relatedId) =>
//       iget(schemas, entities, [relatedModelsName, relatedId] )
//     );
//     return [modelData, { [propertyName]: denormalizedData }];
//     // return {
//     //   ...modelData,
//     //   [propertyName]: denormalizedData,
//     // };
//   }

//   // it's a belongsTo relationship
//   const relatedModelName = propertySchema.key;
//   return {
//     ...modelData,
//     [propertyName]: iget(schemas, entities, [relatedModelName, propertyData, ...remainingPath]),
//   };
// };

// ----------------------
import { schema } from 'normalizr';
import { articlesCommentsUsers as data } from '../test/fixtures';

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

// const schemas = makeSchemas();

const mGetTestFOOOO = (config, schemas, entities, ...paths) => {
  const denormalized = paths.map(path => nget(config, schemas, entities, path));
  console.log("denormalized", denormalized);
  
  return lodashMerge({}, ...denormalized);
};

export const bindMergedGet = schemas =>
  mGetTestFOOOO.bind(null, { shouldFollow: true }, schemas); // TODO: Obvs

const fooMergedGet = bindMergedGet(makeSchemas());
fooMergedGet(data, 'articles.123'.split('.')); /* ?*/

// iget(schemas, data, 'articles.123.author'.split('.'));

// const multiget = (...paths) => paths.reduce((acc, path) => {
//   const results = iget(schemas, data, path.split('.')); /* ?*/
//   return {
//       ...acc,
//       ...results,
//     };
// }, {});

// const article = multiget(
//   'articles.123.comments',
//   'articles.123.author',
//   // 'articles.123.title',
// );
