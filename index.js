const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const { Schema } = mongoose;

mongoose.connect(process.env['MONGO_URI'], { useNewUrlParser: true, useUnifiedTopology: true });

const newUserSchema = new Schema({
  username: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default:''
  },
  duration: {
    type: Number,
    default:''
  },
  date: {
    type: String,
    default:''
  }
})


const logSchema = new Schema({
  username: {
    type: String,
    required: true
  },
  _id: {
    type: String,
    required: true
  },
  count: {
    type: Number,
    required: true
  },
  log:{
    type: Array,
    required: true  
  }
})

let userList = [];
var userLogList = [];

let User = mongoose.model('User', newUserSchema);
let UserLog = mongoose.model('UserLog', logSchema);


const createNSaveUser = async (user, id, logId) => {
  const data = new User({ username: user, _id: id });
  try {
    let output;
    output = await data.save();
    userList.push({username: user, _id: id});
    return output;
  } catch (error) {
    console.log(`error: ${error.message}`)
  }
}

const createNSaveExcercise = async (desc, duration, date) => {
  const data = new Excercise({ description: desc, duration: duration, date: date });
  try {
    let output;
    output = await data.save();
    return output;
  } catch (error) {
    console.log(`error: ${error.message}`)
  }
}

const updateLog = async (userId, excercise) => {
  const userLog = await UserLog.findById(userId);
  userLog.count = userLog.count + 1;
  userLog.log.push(excercise);
  userLog.markModified('userLog.count');
  userLog.markModified('userLog.log');
  await userLog.save();
  return userLog;
}

const doLog = async (id, excercise) => {
  let log;
  const user = await getUser(id);
  console.log(`user: ${user}`);
  const item = await UserLog.findById(id);
  console.log(`log founded: ${item}`)
  if(!item){
    let data = new UserLog({username: user.username, _id: id, count: 1, log: [excercise]});
    try {
      log = await data.save();
    } catch (error) {
      console.log(`error: ${error.message}`)
    }
  } else {
    log = await updateLog(id, excercise);
  }
  console.log(`log: ${log}`)
  return log
}





const getUser = async (id) => {
  try {
    const item = await User.findById(id);
    console.log(`id ${id}`);
    console.log(`item ${item}`);
    return item;
  } catch (error) {
    console.log(`error: ${error.message}`)
  }
}

const updateUser = async (id, excercise) => {
  let output;
  const userObj = await User.findById(id);
  userObj.description = excercise.description;
  userObj.duration = excercise.duration;
  userObj.date = excercise.date;
  userObj.markModified('userObj.description');
  userObj.markModified('userObj.duration');
  userObj.markModified('userObj.date');
  output = await userObj.save();    
  return output;
}


app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.route('/api/users').post(async (req, res) => {
  let id = new ObjectId().toString();
  req.query.logId = new ObjectId().toString();
  let user = await createNSaveUser(req.body.username, id);
  res.json({username: user.username, _id: id});
}).get((req, res) => {
  res.json(userList);
})

app.post('/api/users/:_id/exercises', async (req, res) => {
  let excercise;
  let date = new Date(req.body.date); 
  if(isNaN(Date.parse(date))){
    res.json({error: 'Invalid Date'})
  } else {
    date = date.toDateString();
  }
  let user = await getUser(req.body[':_id']);
  console.log(`user found ${user}`)
  if (!user) res.json({ error: 'Invalid Id' });
  excercise = {description: req.body.description, duration: req.body.duration, date: date}
  let updatedUser = await updateUser(req.body[':_id'], excercise)
  await doLog(req.body[':_id'], excercise);
  console.log(`excercise json: ${excercise}`);
  res.json(updatedUser);
});

app.get('/api/users/:_id/logs', async (req, res) => {
  let output;
  try {
    output = await UserLog.findById(req.params._id);
    console.log(`id ${req.params._id}`);
    console.log(`output ${output}`);
  } catch (error) {
    output = {error: error.message};
  }
  res.json(output);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
