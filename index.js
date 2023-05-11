const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const mongo = require('mongodb');
const { ObjectId } = mongo;
const { Schema } = mongoose;

mongoose.connect(process.env['MONGO_URI'], { useNewUrlParser: true, useUnifiedTopology: true });

const UserSchema = new Schema({
  username: {
    type: String,
    required: true
  }
},
  {
    versionKey: false
  })

const UserExcerciseSchema = new Schema({
  username: {
    type: String,
    required: true
  },
  _id: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  duration: {
    type: Number,
    default: ''
  },
  date: {
    type: String,
    default: ''
  }
},
  {
    versionKey: false
  })


const LogSchema = new Schema({
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
  log: {
    type: Array,
    required: true
  }
},
  {
    versionKey: false
  })

const User = mongoose.model('User', UserSchema);
const UserExcercise = mongoose.model('UserExcercise', UserExcerciseSchema);
const UserLog = mongoose.model('UserLog', LogSchema);

const createNSaveUser = async (user) => {
  const data = new User({ username: user });
  try {
    let output;
    output = await data.save();
    return output;
  } catch (error) {
    console.log(`error: ${error.message}`)
  }
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

const updateLog = async (userId, excercise) => {
  const userLog = await UserLog.findById(userId);
  userLog.log.push(excercise);
  userLog.markModified('userLog.count');
  userLog.markModified('userLog.log');
  userLog.count = userLog.log.length;
  await userLog.save();
  return userLog;
}

const doLog = async (user, excercise) => {
  const item = await UserLog.findById(user._id);
  console.log(`log founded: ${item}`)
  if (!item) {
    let data = new UserLog({ username: user.username, _id: user.id, count: 1, log: [excercise] });
    try {
      log = await data.save();
    } catch (error) {
      console.log(`error: ${error.message}`)
    }
    console.log(`log: ${log}`)
    return log
  } else {
    log = await updateLog(user.id, excercise);
    console.log(`log: ${log}`)
    return log
  }
}

const createNSaveExcercise = async (userId, excercise) => {
  const user = await User.findById(userId);
  let userExcercise = await UserExcercise.findById(userId);
  if (!userExcercise) {
    userExcercise = new UserExcercise({ username: user.username, _id: user._id, ...excercise });
  } else {
    userExcercise.description = excercise.description;
    userExcercise.duration = excercise.duration;
    userExcercise.date = excercise.date;
    userExcercise.markModified('userExcercise.description');
    userExcercise.markModified('userExcercise.duration');
    userExcercise.markModified('userExcercise.date');
  }
  let output;
  try {
    output = await userExcercise.save();
  } catch (error) {
    console.log(`error: ${error.message}`)
  }
  if (output) await doLog(user, excercise);
  return output;
}



app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.route('/api/users').post(async (req, res) => {
  let user = await createNSaveUser(req.body.username);
  return res.json(user);
}).get(async (req, res) => {
  const userList = await User.find();
  return res.json(userList);
})

app.post('/api/users/:_id/exercises', async (req, res) => {
  let excercise;
  let date = new Date(req.body.date).toDateString();
  if (!req.body.date) date = new Date().toDateString();
  if (!req.body.description || !req.body.duration)
    return res.json({ error: 'incomplete fields' });
  if (isNaN(Date.parse(date))) {
    return res.json({ error: 'Invalid Date' });
  }
  if (isNaN(req.body.duration)) {
    return res.json({ error: 'Duration must be a number in minutes' });
  }
  if (typeof req.body.description === 'string') {
    return res.json({ error: 'description cant be a number' });
  }
  let user = await getUser(req.body[':_id']);
  console.log(`user found ${user}`)
  if (!user) return res.json({ error: 'Invalid Id' });
  excercise = { description: req.body.description, duration: req.body.duration, date: date };
  const userExcercise = await createNSaveExcercise(req.body[':_id'], excercise);
  console.log(`excercise json: ${userExcercise}`);
  return res.json(userExcercise);
});

const compareDates = (d1, d2, excercise) => {
  let fromDate = new Date(d1).getTime();
  let limitDate = new Date(d2).getTime();
  let excerciseDate = new Date(excercise.date).getTime();
  if (!d1 && !d2) return excercise
  if (!d1 && d2) {
    if (limitDate >= excerciseDate) return excercise;
  }
  if (!d2 && d1) {
    if (fromDate <= excerciseDate) return excercise;
  }
  if (fromDate <= excerciseDate && limitDate >= excerciseDate) {
    return excercise;
  }
};

app.get('/api/users/:_id/logs', async (req, res) => {
  let userLog = await UserLog.findById(req.params._id);
  console.info(`log obj: ${JSON.stringify(userLog)}`)
  if (!userLog) {
    return res.json({ error: 'invalid userLog' })
  } else {
    let userExcerciseLog = userLog.log;
    console.log(`params: ${[req.query.limit, req.query.from, req.query.to]}}`);
    const filteredLog = [];
    let length = userExcerciseLog.length - 1;
    if (req.query.limit) length = req.query.limit;
    for (let i = 0; i <= length; i++) {
      let filter = compareDates(req.query.from, req.query.to, userExcerciseLog[i]);
      if (filter) filteredLog.push(filter);
    }
    console.info(`log json: ${JSON.stringify(filteredLog)}`);
    return res.json({ username: userLog.username, _id: userLog._id, count: filteredLog.length, log: filteredLog });
  }
});



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

