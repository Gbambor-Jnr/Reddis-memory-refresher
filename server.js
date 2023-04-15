const express = require("express");
const util = require("util");
const axios = require("axios");
const redis = require("redis");
const { json } = require("express");

const redisUrl = "redis://127.0.0.1:6379";
// const client = redis.createClient(redisUrl);
const client = redis.createClient({
  legacyMode: true,
  PORT: 6379,
});
client.connect().catch(console.error);

client.set = util.promisify(client.set); //becasue the redis library works with callbacks and not promises, inorder to return a promise we use the node module util and the promisify method built inside of it
client.get = util.promisify(client.get);
const app = express();
app.use(express.json());

app.post("/redis", async (req, res, next) => {
  const { key, value } = req.body;
  const response = await client.set(key, value); //this means just like the normal redis command (set name ikenna), you have to define a key and its value pair
  res.json(response);
});

app.get("/", async (req, res) => {
  const { key } = req.body;
  const value = await client.get(key);
  res.json(value);
});

app.get("/posts/:id", async (req, res) => {
  const paramId = req.params.id;
  if (isNaN(paramId)) {
    return;
  }
  const cachedPost = await client.get(`post-${paramId}`); //here we are just using a variable called post-id as a KEY to store each of this pages in the request for instance for page-1, we cache it with post-1 if it exixts, for page-2 and so on. PLEASE NOTE that we first of all set this key down with client.set()
  if (cachedPost) {
    return res.json(JSON.parse(cachedPost)); //this is because redis only stores strings in memoryso whatever you are getting from redis is a string version
  }
  const response = await axios.get(
    `https://jsonplaceholder.typicode.com/posts/${paramId}`
  );
  client.set(`post-${paramId}`, JSON.stringify(response.data), "EX", 10); //10 means 10seconds so after 10seconds it expires and makes the request afresh

  return res.json(response.data);
});
app.listen(8083, () => console.log("connected"));
