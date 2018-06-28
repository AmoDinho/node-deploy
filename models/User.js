const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.Promise = global.Promise;
const md5 = require('md5');
const validator = require('validator');
const mongodbErrorHandler = require('mongoose-mongodb-errors');
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new Schema({
   
    email:{
        type:String,
        unique:true,
        lowercase: true,
        trim: true,
        validate: [validator.isEmail, 'Invlaid Email Address'],
        required:'Please suplly an email address'
    },
    name:{
        type:String,
        required: 'Please suplly a name',
        trim:true
    },
    resetPasswordToken:String,
    resetPasswordExpires: Date,
    hearts:[
        {type: mongoose.Schema.ObjectId, ref: 'Store'}
    ] 
    
});

userSchema.virtual('gravatar').get(function(){
  const hash = md5(this.email);
  return `https://gravatar.com/avatar/${hash}?s=200`;
});

userSchema.statics.getHeartList = function(){
    return this.aggregate([
       {$unwind: '$hearts'},
       {$sort:{count:-1}}
    ]);
}

userSchema.plugin(passportLocalMongoose, {usernameField:'email'});
userSchema.plugin(mongodbErrorHandler);

module.exports = mongoose.model('User', userSchema);


