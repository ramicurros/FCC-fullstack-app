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

const excerciseSchema = new Schema({
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  date: {
    type: String,
    default: new Date().toDateString()
  }
});

const logSchema = new Schema({
  username: {
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
let User = mongoose.model('User', newUserSchema);
let Excercise = mongoose.model('Excercise', excerciseSchema);
let UserLog = mongoose.model('UserLog', logSchema);

const createNSaveUser = async (user, id) => {
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

const updateLog = async (user, excercise) => {
  const userLog = await UserLog.findOne({username: user});
  userLog.count = userLog.count + 1;
  userLog.log.push(excercise);
  userLog.markModified('userLog.count');
  userLog.markModified('userLog.log');
  await userLog.save();
  return userLog;
}

const doLog = async (user, excercise) => {
  let log;
  const item = await UserLog.findOne({username: user});
  console.log(`found log: ${item}`)
  if(!item){
    let data = new UserLog({username: user, count: 1,log: [excercise]});
    try {
      log = await data.save();
    } catch (error) {
      console.log(`error: ${error.message}`)
    }
  } else {
    log = await updateLog(user, excercise);
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
  let id = new ObjectId();
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
  excercise = await createNSaveExcercise(req.body.description, req.body.duration, date);
  let updatedUser = await updateUser(req.body[':_id'], {...excercise._doc})
  await doLog(user.username, {...excercise._doc});
  console.log(`excercise json: ${excercise}}`);
  res.json(updatedUser);
});

app.get('/api/users/:_id/logs', async (req, res) => {
  let output;
  let user = await getUser(req.params._id);
  try {
    const log = await UserLog.findOne({username: user.username});
    console.log(`id ${req.params._id}`);
    console.log(`log ${log}`);
    output = {...log._doc, _id: req.params.id};
    console.log(`output ${output}`);
  } catch (error) {
    output = {error: error.message};
  }
  res.json(output);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
