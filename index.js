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
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  date: {
    type: String,
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

const updateLog = async (user) => {
  const userLog = await UserLog.findById(user._id);
  userLog.log.push({description: user.description, duration: user.duration, date: user.date});
  userLog.markModified('userLog.log');
  userLog.count = userLog.log.length;
  userLog.markModified('userLog.count');
  await userLog.save();
  return userLog;
}

const doLog = async (user) => {
  let data = new UserLog({ username: user.username, _id: user.id, count: 0, log: [] });
    try {
      log = await data.save();
    } catch (error) {
      console.log(`error: ${error.message}`)
    }
    console.log(`log: ${log}`)
    return log;
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
  return output;
}



app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.route('/api/users').post(async (req, res, next) => {
  req.user = await createNSaveUser(req.body.username);
  await doLog(req.user);
  next();
}, (req, res) => {
  res.json(req.user);
}).get(async (req, res, next) => {
  req.userList = await User.find();
  next();
}, (req, res) => {
  res.json(req.userList);
})

app.post('/api/users/:_id/exercises', async (req, res, next) => {
  req.excerciseDate = new Date(req.body.date).toDateString();
  if (!req.body.date){
    req.excerciseDate = new Date().toDateString();
  } 
  user = await getUser(req.body[':_id']);
  userExcercise = {...user._doc}
  console.log(`user found ${user}`)
  if (user && req.body.description && req.body.duration) {
    userExcercise.description = req.body.description;
    userExcercise.duration = req.body.duration;
    userExcercise.date = req.excerciseDate;
    console.log(`user update ${userExcercise}`) 
    await updateLog(userExcercise);
  } 
  next();
}, async (req, res) =>{
  if (!req.body.description || !req.body.duration){
    return res.json({ error: 'Incomplete fields' });
  }
  if (isNaN(Date.parse(req.excerciseDate))) {
    return res.json({ error: 'Invalid Date' });
  }
  if (isNaN(req.body.duration)) {
    return res.json({ error: 'Duration must be a number in minutes'});
  }
  if (typeof req.body.description !== 'string') {
    return res.json({ error: 'Description must be a string' });
  }
  if (!user) {
    return res.json({ error: 'Invalid Id' });
  }
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

app.get('/api/users/:_id/logs', async (req, res, next) => {
  req.userLog = await UserLog.findById(req.params._id);
  console.info(`log obj: ${JSON.stringify(req.userLog)}`);
  if(req.userLog){
    let userExcerciseLog = req.userLog.log;
    console.log(`params: ${[req.query.limit, req.query.from, req.query.to]}}`);
    req.filteredLog = [];
    let length = userExcerciseLog.length - 1;
    if (req.query.limit) length = req.query.limit;
    for (let i = 0; i <= length; i++) {
      let filter = compareDates(req.query.from, req.query.to, userExcerciseLog[i]);
      if (filter) req.filteredLog.push(filter);
    }
    console.info(`log json: ${JSON.stringify(req.filteredLog)}`);
  }
  next();
}, async (req, res) => {
  if (!req.userLog) {
    return res.json({ error: 'invalid userLog' })
  } else {
    return res.json({ username: req.userLog.username, _id: req.userLog._id, count: req.filteredLog.length, log: req.filteredLog });
  }
});



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

