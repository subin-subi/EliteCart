import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { configDotenv } from 'dotenv';
configDotenv();

passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://www.elitekart.space/auth/google/callback"
  },
  async (token, tokenSecret, profile, done) => {
    try {
      const userProfile = {
        id: profile.id,
        displayName: profile.displayName,
        email: profile.emails[0].value
      };
      return done(null, userProfile);  
    } catch (error) {
      return done(error, null);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

export default passport;
