
var Bookshelf = require('./base');

var Participant = Bookshelf.Model.extend({
  tableName: "participants",
  hasTimestamps : true,

  room: function () {
    // one-to-one or many-to-one
    return this.belongsTo('Room', "room_id");
  },
  domainuser: function () {
    // one-to-one or many-to-one
    return this.belongsTo('Domainuser', "domainuser_id");
  },
  last_message: function () {
    // one-to-one or many-to-one
    return this.belongsTo('Message', "last_message_id");
  },
});

var Participants = Bookshelf.Collection.extend({
  model: Participant
});

module.exports = {
  Participant: Bookshelf.model('Participant', Participant),
  Participants: Bookshelf.collection('Participants', Participants)
}
