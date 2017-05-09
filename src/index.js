import lodashGet from 'lodash.get';
import lodashMergeWith from 'lodash.mergewith';
import stringToPath from 'lodash._stringtopath';

/**
 * Throw a useful error for a missing property and suggest alternatives.
 * @param {*} modelData
 * @param {*} modelName
 * @param {*} propertyName
 * @param {*} path
 * @private
 */
function throwMissingPropertyError(modelData, modelName, propertyName, path) {
  throw new Error(
    `Could not find property '${propertyName}' on '${modelName}' for path [${path.join('.')}]. Available properties: [${Object.keys(modelData)}]`
  );
}

/**
 * Recursive function that uses the schemas to follow arbitrary paths through
 * the entity graph. It can provide either the leaf nodes (the end of the pat) or
 * the structure leading up to that, suitable for deep merging with other calls.
 *
 * @param {*} shouldMerge Provide parent data shape or just the leaf nodes. Future config object goes here, if needed.
 * @param {*} schemas redux-query schemas or equivelent
 * @param {*} entities normalizr entities
 * @param {Array} path Path parts split into an Array
 * @private
 */
const nget = (shouldMerge, schemas, entities, path) => {
  const [modelName, id, propertyName, ...remainingPath] = path;
  const modelData = entities[modelName] && entities[modelName][id];
  const propertyData = modelData && modelData[propertyName];
  const schema = schemas[modelName];
  let results;

  if (!propertyName) {
    return modelData;
  } // No more properties to find. We're done.

  if (typeof modelData === 'undefined') {
    return undefined;
  } // cache miss. Ignore.

  // requireKnownSchema(schemas, modelName, path);
  if (typeof propertyData === 'undefined') {
    throwMissingPropertyError(modelData, modelName, propertyName, path);
  }

  const propertySchema = schema.schema[propertyName];

  if (!propertySchema) {
    // it's a normal non-relational property, defer to lodashGet
    results = lodashGet(modelData, [propertyName, ...remainingPath]);
  } else if (Array.isArray(propertySchema)) {
    // it's a hasMany relationship
    const relatedModelsName = propertySchema[0].key;

    // return all the related records
    results = propertyData.map(relatedId =>
      nget(shouldMerge, schemas, entities, [
        relatedModelsName,
        relatedId,
        ...remainingPath
      ])
    );
  } else {
    // it's a belongsTo relationship
    const relatedModelName = propertySchema.key;
    results = nget(shouldMerge, schemas, entities, [
      relatedModelName,
      propertyData,
      ...remainingPath
    ]);
  }

  return shouldMerge ? { ...modelData, [propertyName]: results } : results;
};

/**
 * Parses the pathString using lodash's stringToPath function.
 *
 * @private
 */
const parsedNGet = (shouldMerge, schemas, entities, pathString) => {
  const path = stringToPath(pathString);
  const [rootModelName, rootModelId] = path;
  if (typeof entities[rootModelName] === 'undefined') {
    const knownSchemas = Object.keys(schemas);
    throw new Error(
      `Could not find schema '${rootModelName}' for path '${pathString}'. Known schemas: [${knownSchemas.join(',')}].`
    );
  }
  const results = nget(shouldMerge, schemas, entities, path);
  return shouldMerge ? { [rootModelName]: { [rootModelId]: results } } : results;
};

/**
 * Deep merge customizer that prevents strings from overriding objects. This
 * makes it possible for us to deepmerge multiple paths without worrying about
 * the order in which those were fetched. It's based on the assumption that
 * a string is a key and an object is a previously denormalized data that should
 * be preserved.
 *
 * @private
 */
const preferObjectsCustomizer = (a, b) => {
  const typeA = typeof [].concat(a)[0];
  const typeB = typeof [].concat(b)[0];
  if (typeA === 'object' && typeB === 'object') {
    return lodashMergeWith(a, b, preferObjectsCustomizer);
  }
  const shouldPreserveObject = typeA === 'object' && typeB === 'string';
  return shouldPreserveObject ? a : b;
};

/**
 * Maps over multiple paths and deep merges them using a special customizer
 * that preserves denormalized data.
 *
 * @private
 */
export const parsedNGetMulti = (
  shouldMerge,
  schemas,
  entities,
  ...pathStrings
) => {
  const results = pathStrings.map(pathString =>
    parsedNGet(true, schemas, entities, pathString)
  );

  return lodashMergeWith({}, ...results, preferObjectsCustomizer);
};

/**
 * Produces a getter that is prebound to redux-query schemas and normalizr
 * entities. The bound function accepts a single path string and returns the
 * leaf ndoe of the graph. It will follow Array types.
 *
 * @param {Object} schemas
 * @param {Object} entities
 */
export const bindNormalizedGet = (schemas, entities) =>
  parsedNGet.bind(null, false, schemas, entities);

/**
 * Produces a getter that is prebound to redux-query schemas and normalizr
 * entities. The bound function accepts multiple path strings and returns
 * the combined result of all of them.
 *
 * @param {*} schemas
 * @param {*} entities
 */
export const bindGraphGet = (schemas, entities) =>
  parsedNGetMulti.bind(null, true, schemas, entities);
