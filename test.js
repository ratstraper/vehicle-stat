/*
Packages installed
------------------
@aws-sdk/client-s3
@azure/storage-blob
@azure/identity
async
axios
chai
chai-spies
express
jest
jsonwebtoken
lodash
mocha
moment
mssql
mysql2
node-fetch
uuid
web3
*/

const obj = {
    "banana": 1,
    "apple": 2,
    "cherry": 3
  };
  
  // Сортировка ключей
  console.log(Object.keys(obj))
  const sortedObj = Object.keys(obj)
    .sort()  // Сортируем ключи
    .reduce((acc, key) => {
      acc[key] = obj[key];  // Восстанавливаем объект с отсортированными ключами
      return acc;
    }, {});
  
  // Преобразуем объект обратно в JSON
  const sortedJson = JSON.stringify(sortedObj, null, 2);
  
  console.log(sortedJson);