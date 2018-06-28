const passport = require('passport');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');
const mail = require('../handlers/mail');

exports.login = passport.authenticate('local', {
    failureRedirect: '/Login',
    failureFlash:'Failed Login',
    successRedirect:'/',
    successFlash:'You are now logged in!'

});

exports.logout = (req,res) =>{
    req.logout();
    req.flash('success','successfully logged out!');
    res.redirect('/');
};

exports.isLoggedIn = (req,res,next) =>{
    //first check if user is authenticated
    if(req.isAuthenticated()){
        next();
        return;
    }
    req.flash('error', 'Opps you need to be logged in to do that');
    res.redirect('/login');
}


exports.forgot = async (req,res) =>{
    //1.See if a user exists with that email
    const user = await User.findOne({email:req.body.email});
    if(!user){
        req.flash('error', 'Nothing exists with that email address');
        return res.redirect('/login');

    }
    //2.set reset tokens and expiry on their account
    user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordExpires = Date.now() + 3600000;    //1hour from now
    await user.save();
    //3. send them an email with token
    const resetURL = `http://${req.headers.host}.account/reset/${user.resetPasswordToken}`;
    await mail.send({
       user,
       subject:'Password Reset',
       resetURL,
       filename:'password-reset',
    });
    req.flash('success', `You have been emailed a password reset link.`);
    //4. redirect to login page
    res.redirect('/login');
}

exports.reset = async(req,res) =>{
    const user = await User.findOne({
       resetPasswordToken: req.params.token,
       resetPasswordExpires: {$gt: Date.now()}
    });
    if(!user){
        req.flash('error', 'Password rest is invalid or has expired');
        return res.redirect('/login');
    }
    //iif there is a user show the rest of password form
    res.render('reset',{title:'Reset your Password'});
}
exports.confirmedPasswords = (req, res,next) =>{
    if (req.body.password === req.body['password-confirm']){
        next();
        return;
    }
    req.flash('error', 'Passwords do not match');
    res.redirect('back');
};

exports.update = async (req,res) =>{
    const user = await User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: {$gt: Date.now()}
     });

     if(!user){
        req.flash('error', 'Password rest is invalid or has expired');
        return res.redirect('/login');
    }

    const setPassword = promisify(user.setPassword, user);
    await setPassword(req.body.password);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    const updatedUser = await user.save();
    await req.login(updatedUser);
    req.flash('Success', 'Nice your password has been reset');
    res.redirect('/');


};