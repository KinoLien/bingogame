
var Bookshelf = require('./base');

var Answerlog = Bookshelf.Model.extend({
  tableName: "answerlogs",
  hasTimestamps : true,

  // domain: function () {
  //   // one-to-one or many-to-one
  //   return this.belongsTo('Domain', "domain_id");
  // },
  // messages: function () {
  //   // one-to-many
  //   return this.hasMany('Message');
  // },
  // participants: function () {
  //   // one-to-many
  //   return this.hasMany('Participant');
  // },
  // last_message: function () {
  //   // one-to-one or many-to-one
  //   return this.belongsTo('Message', "last_message_id");
  // },

  player: function(){
    return this.belongsTo('Player', 'p_id');
  },

  question: function(){
    return this.belongsTo('Question', 'q_id');
  }

});

var Answerlogs = Bookshelf.Collection.extend({
  model: Answerlog
});

module.exports = {
  Answerlog: Bookshelf.model('Answerlog', Answerlog),
  Answerlogs: Bookshelf.collection('Answerlogs', Answerlogs)
}
