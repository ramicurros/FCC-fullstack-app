  const express = require('express');
  const app = express();
  const cors = require('cors');
  require('dotenv').config();
  const bodyParser = require('body-parser');
  const mongoose = require('mongoose');
  const mongo = require('mongodb');
  const { ObjectId } = mongo;
  const { Schema } = mongoose;
  const { DateTime } = require('luxon');

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
      type: Date
    }
  },
  {
    versionKey: false
  });

  const User = mongoose.model('User', UserSchema);
  const UserExcercise = mongoose.model('UserExcercise', UserExcerciseSchema);

  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(cors());
  app.use(express.static('public'));
  app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html')
  });

  app.route('/api/users').post( async (req, res) => {
    const user = new User({username: req.body.username});
    await user.save();
    res.json(user);
  }).get( async (req, res) => {
    const userList = await User.find();
    res.json(userList);
  })

  app.post('/api/users/:_id/exercises', async (req, res) => {
    const duration = parseInt(req.body.duration);
    const user = await User.findById(req.params._id);
    let date =  DateTime.fromISO(req.body.date).toJSDate().toDateString();
    if(!req.body.date) date = new Date().toDateString(); 
    const excercise = new UserExcercise({username: user.username, user_id: user._id, description: req.body.description, duration: duration, date: date});
    console.log(excercise)
    await excercise.save();
    res.json({username: user.username, description: req.body.description, duration: duration, date: date, _id: user._id });
  });

  const compareDates = (from, to, excercise) => {
    let excerciseDate = new Date(excercise.date).getTime();
    if (!from && !to) return true;
    let fromDate = new Date(from).getTime();
    let limitDate = new Date(to).getTime();
    if (!from && to) {
      if (limitDate >= excerciseDate) return true;
    }
    if (!to && from) {
      if (fromDate <= excerciseDate) return true;
    }
    if (fromDate <= excerciseDate && limitDate >= excerciseDate) {
      return true;
    }
  };

  app.get('/api/users/:_id/logs', async (req, res) => {
    const user = await User.findById(req.params._id);
    const excercises = await UserExcercise.find({ user_id: req.params._id });
    console.log(`excercises: ${excercises}`);
    console.log(`params: ${[req.query.limit, req.query.from, req.query.to]}`);
    const filteredLog = [];
    let length = excercises.length;
    if (req.query.limit) length = req.query.limit;
    for (let i = 0; i <= length - 1; i++) {
      let item = { ...excercises[i]._doc };
      if(compareDates(req.query.from, req.query.to, item));
      filteredLog.push({description: item.description, duration: item.duration, date: item.date.toDateString()});
    }
    res.json({ username: user.username, _id: user._id, count: excercises.length, log: filteredLog });
  });



  const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('Your app is listening on port ' + listener.address().port)
  })

