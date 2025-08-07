// Passport config config/passport.js

const LocalStrategy = require('passport-local').Strategy;
const bcrypt        = require('bcryptjs');
const User          = require('../models/user');

module.exports = (passport) => {
  passport.use(
    new LocalStrategy({ usernameField: 'username' }, async (username, password, done)=>{
      try {
        const user = await User.findOne({ where: { username: username } });
        if(!user) return done(null,false,{ message:'No user found' });

        const match = await bcrypt.compare(password, user.passwordHash);
        if(!match)  return done(null,false,{ message:'Password incorrect' });

        return done(null, user);
      } catch(err) { return done(err); }
    })
  );

  passport.serializeUser( (user, done)=> done(null, user.id) );
  passport.deserializeUser( async(id, done)=> {
    try {
      const user = await User.findByPk(id);
      done(null, user);
    } catch(err){ done(err); }
  });
};