// ==========================================================
// js/db/repository.js
// 通用 CRUD / 查询封装
// 供上层具体 Repository 复用，避免重复事务代码
// ==========================================================

/**
 * 查询 Store 的所有记录
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @returns {Promise<Array>}
 */
export function findAll(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * 根据主键查询单条记录
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @param {number|string} key
 * @returns {Promise<Object|null>}
 */
export function findById(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * 根据某个索引查询记录列表（精确匹配）
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @param {string} indexName
 * @param {any} key
 * @returns {Promise<Array>}
 */
export function findByIndex(db, storeName, indexName, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * 获取按索引降序排列的前 N 条记录
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @param {string} indexName
 * @param {number} limit - 默认取 10 条
 * @returns {Promise<Array>}
 */
export function getTopByIndex(db, storeName, indexName, limit = 10) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const results = [];
    const cursorReq = index.openCursor(null, 'prev'); // 降序遍历

    cursorReq.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor && results.length < limit) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    cursorReq.onerror = (e) => reject(e.target.error);
  });
}

/**
 * 新增一条记录，返回新记录的主键
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @param {Object} data
 * @returns {Promise<number|string>}
 */
export function add(db, storeName, data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.add(data);
    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * 更新（或覆盖）一条记录
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @param {Object} data - 必须包含主键字段
 * @returns {Promise<number|string>}
 */
export function update(db, storeName, data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(data);
    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * 根据主键删除一条记录
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @param {number|string} key
 * @returns {Promise<void>}
 */
export function remove(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * 清空 Store 全部数据
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @returns {Promise<void>}
 */
export function clearStore(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e.target.error);
  });
}