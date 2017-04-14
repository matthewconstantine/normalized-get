import lodashGet from 'lodash.get';
import memoize from 'lodash.memoize';
import stringToPath from 'lodash._stringtopath';

const nget = (schemas, entities, path) => {
  const [modelName, id, propertyName, ...remainingPath] = path;
  const modelData = entities[modelName] && entities[modelName][id];
  if (!propertyName) { return modelData; } // No more properties to find. We're done.

  if (typeof modelData === 'undefined') { return undefined; }  // cache miss. Ignore.

  const schema = schemas[modelName];
  if (typeof schema === 'undefined') { 
    throw new Error(`Could not find schema '${modelName}' for path [${path.join(', ')}]. Availalbe schemas: [${Object.keys(schemas)}]`); 
  }

  const propertyData = modelData[propertyName];  // may be an array or value
  if (typeof propertyData === 'undefined') {
    throw new Error(`Could not find property '${propertyName}' on '${modelName}' for path [${path.join(', ')}]. Available properties: [${Object.keys(modelData)}]`);
  }

  const propertySchema = schema.schema[propertyName];

  // it's a normal non-relational property, defer to lodashGet
  if (!propertySchema) {  
    return !propertySchema && lodashGet(modelData, [propertyName, ...remainingPath]);
  }

  // it's a hasMany relationship
  if (Array.isArray(propertySchema)) {
    const relatedModelsName = propertySchema[0].key;
    if (remainingPath.length) {
      const [pathHead, ...pathTail] = remainingPath;
      const relatedModelsIdByIndex = propertyData[pathHead];
      return nget(schemas, entities, [relatedModelsName, relatedModelsIdByIndex, ...pathTail]);
    }
    // return all the related records
    return propertyData.map((relatedId) => {
      return nget(schemas, entities, [relatedModelsName, relatedId]);
    });
  }

  // it's a belongsTo relationship
  const relatedModelName = propertySchema.key;
  return nget(schemas, entities, [relatedModelName, propertyData, ...remainingPath]);
};

export const parsedNGet = (schemas, entities, pathString) => {
  const path = stringToPath(pathString);
  const rootModelName = path[0];
  if (typeof entities[rootModelName] === 'undefined') {
    const knownSchemas = Object.keys(schemas);
    throw new Error(`Could not find property '${rootModelName}' for path '${pathString}'. Known keys: [${knownSchemas.join(',')}].`); 
  }
  return nget(schemas, entities, path);
};

export const bindNormalizedGet = (schemas) => parsedNGet.bind(null, schemas);
