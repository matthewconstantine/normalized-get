const _flatPathGet = (object, path = []) => {
  let result = object[path.shift()];
  if (path.length === 0) { return result; }
  for (let property of path) {
    result = result[property];
  }
  return result;
}

const _nget = (schemas, entities, path) => {
  const [modelName, id, propertyName, ...remainingPath] = path;
  const modelData = entities[modelName] && entities[modelName][id];
  if (typeof modelData === 'undefined') { return undefined; }  // cache miss. Ignore.
  if (!propertyName) { return modelData } // No more properties to find. We're done.

  const schema = schemas[modelName];
  const propertyData = modelData[propertyName];  // may be an array or value
  if (typeof schema === 'undefined') { throw new Error(`Expected to find a schema for '${modelName}' for path '${path}'`); }
  if (typeof propertyData === 'undefined') { throw new Error(`Could not find '${propertyName}' on '${modelName}' for '${path}'`); }
  const propertySchema = schema.schema[propertyName];

  if (!propertySchema) {  // it's a normal property (non-relational)
    return !propertySchema && _flatPathGet(modelData, [propertyName, ...remainingPath]);
  
  } else if (Array.isArray(propertySchema)) { // it's a hasMany
    const relatedModelsName = propertySchema[0].key;
    return propertyData.map((relatedId) => {
      return _nget(schemas, entities, [relatedModelsName, relatedId, ...remainingPath]);
    });
  
  } else { // it's a hasOne
    const relatedModelName = propertySchema.key;
    return _nget(schemas, entities, [relatedModelName, propertyData, ...remainingPath]);
  }
}

export const _parsedNGet = (schemas, entities, ...segments) => {
  const path = segments.reduce((acc, s) => { 
    s = s.split ? s.split('.') : [s]; 
    acc.push(...s); 
    return acc;
  }, []);
  return _nget(schemas, entities, path);
}

export const bindNGet = (schemas, entities) => _parsedNGet.bind(null, schemas, entities);
