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
});

const UserExcerciseSchema = new Schema({
  username: {
    type: String,
    required: true
  },
  user_id: {
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
    type: String
  }
},
{
  versionKey: false
});

const User = mongoose.model('User', UserSchema);
const UserExcercise = mongoose.model('UserExcercise', UserExcerciseSchema);


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


app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.route('/api/users').post(async (req, res, next) => {
  req.user = new User({username: req.body.username});
  await req.user.save();
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
  user = await User.findById(req.params._id);
  date = await new Date(req.body.date).toDateString();
  if(!req.body.date) date = await new Date().toDateString(); 
  req.excercise = await new UserExcercise({username: user.username, user_id: user._id, description: req.body.description, duration: req.body.duration, date: date});
  console.log(req.excercise)
  await req.excercise.save();
  next();
},  
(req, res) => {
  res.json({username: user.username, _id: user._id, description: req.body.description, duration: req.body.duration, date: date});
});

const compareDates = (d1, d2, excercise) => {
  let fromDate = new Date(d1).getTime();
  let limitDate = new Date(d2).getTime();
  let excerciseItem = {description: excercise.description, duration: excercise.duration,date: excercise.date}
  let excerciseDate = new Date(excercise.date).getTime();
  if (!d1 && !d2) return excerciseItem;
  if (!d1 && d2) {
    if (limitDate >= excerciseDate) return excerciseItem;
  }
  if (!d2 && d1) {
    if (fromDate <= excerciseDate) return excerciseItem;
  }
  if (fromDate <= excerciseDate && limitDate >= excerciseDate) {
    return excerciseItem;
  }
};

app.get('/api/users/:_id/logs', async (req, res, next) => {
  user = await User.findById(req.params._id);
  excercises = await UserExcercise.find({ user_id: req.params._id }, 'description duration date');
  console.log(`params: ${[req.query.limit, req.query.from, req.query.to]}}`);
  req.filteredLog = [];
  let length = excercises.length - 1;
  if (req.query.limit) length = req.query.limit;
  for (let i = 0; i <= length; i++) {
    let item = { ...excercises[i]._doc };
    item.date = new Date(item.date).toDateString();
    let inDateItem = await compareDates(req.query.from, req.query.to, item);
    if (inDateItem) req.filteredLog.push(inDateItem);
  }
  next();
}, (req, res) => {
  res.json({ username: user.username, _id: user._id, count: req.filteredLog.length, log: req.filteredLog });
});



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

