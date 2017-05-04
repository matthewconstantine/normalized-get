import lodashGet from 'lodash.get';
import lodashMergeWith from 'lodash.mergewith';
import memoize from 'lodash.memoize';
import stringToPath from 'lodash._stringtopath';

const requireKnownSchema = (schema, modelName, path) => {
  if (typeof schema === 'undefined') {
    throw new Error(
      `Could not find schema '${modelName}' for path [${path.join('.')}]. Availalbe schemas: [${Object.keys(schemas)}]`
    );
  }
};

const requireKnownProperty = (
  propertyData,
  modelData,
  modelName,
  propertyName,
  path
) => {
  if (typeof propertyData === 'undefined') {
    throw new Error(
      `Could not find property '${propertyName}' on '${modelName}' for path [${path.join('.')}]. Available properties: [${Object.keys(modelData)}]`
    );
  }
};

const requireShouldFollowForRemainingPath = (
  remainingPath,
  path,
  propertyName
) => {
  if (remainingPath.length) {
    throw new Error(
      `Cannot follow the remaining path '${remainingPath}' for path '${path.join('.')}' while denormalizing '${propertyName}' because the 'shouldFollow' option was not provided.`
    );
  }
};

const nget = (config, schemas, entities, path) => {
  const [modelName, id, propertyName, ...remainingPath] = path;
  const modelData = entities[modelName] && entities[modelName][id];
  const propertyData = modelData && modelData[propertyName];
  const { shouldFollow, shouldMerge } = config;
  const schema = schemas[modelName];
  let results;

  if (!propertyName) {
    return modelData;
  } // No more properties to find. We're done.

  if (typeof modelData === 'undefined') {
    return undefined;
  } // cache miss. Ignore.

  requireKnownSchema(schema, modelName, path);
  requireKnownProperty(propertyData, modelData, modelName, propertyName, path);

  const propertySchema = schema.schema[propertyName];

  if (!propertySchema) {
    // it's a normal non-relational property, defer to lodashGet
    results = lodashGet(modelData, [propertyName, ...remainingPath]);
  } else if (Array.isArray(propertySchema)) {
    // it's a hasMany relationship
    const relatedModelsName = propertySchema[0].key;
    if (!shouldFollow) {
      requireShouldFollowForRemainingPath(remainingPath, path, propertyName);
    }

    // return all the related records
    results = propertyData.map(relatedId =>
      nget(config, schemas, entities, [
        relatedModelsName,
        relatedId,
        ...remainingPath
      ])
    );
  } else {
    // it's a belongsTo relationship
    const relatedModelName = propertySchema.key;
    results = nget(config, schemas, entities, [
      relatedModelName,
      propertyData,
      ...remainingPath
    ]);
  }

  return shouldMerge ? { ...modelData, [propertyName]: results } : results;
};

// _.mergeBy([{
//   author: 123
// }, {
//   author: {}
// }], (a, b) => {
//   if [].concat(a)[0] or [].concat(b)[0] // is an object, choose that one
//   // ["mystring"]
//   // [{}, {}, {}]
//   // 123 vs. [123, 4321, 5439]
// })

const parsedNGet = (config = {}, schemas, entities, pathString) => {
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

const preferObjectsCustomizer = (a, b) => {
  const shouldPreserveObject =
    typeof [].concat(a)[0] === 'object' && typeof [].concat(b)[0] === 'string';
  return shouldPreserveObject ? a : b;
};

export const parsedNGetMulti = (
  config = {},
  schemas,
  entities,
  ...pathStrings
) => {
  const results = pathStrings.map(pathString =>
    parsedNGet(config, schemas, entities, pathString)
  );
  console.log('results', results);

  return lodashMergeWith({}, ...results, preferObjectsCustomizer);
};

// TODO: bind the data too
export const bindNormalizedGet = (schemas, config) =>
  parsedNGet.bind(null, config, schemas);

export const bindGraphGet = (schemas, entities) =>
  parsedNGetMulti.bind(
    null,
    { shouldMerge: true, shouldFollow: true },
    schemas,
    entities
  );
