
var Bookshelf = require('./base');

var Room = Bookshelf.Model.extend({
  tableName: "rooms",
  hasTimestamps : true,

  domain: function () {
    // one-to-one or many-to-one
    return this.belongsTo('Domain', "domain_id");
  },
  messages: function () {
    // one-to-many
    return this.hasMany('Message');
  },
  participants: function () {
    // one-to-many
    return this.hasMany('Participant');
  },
  last_message: function () {
    // one-to-one or many-to-one
    return this.belongsTo('Message', "last_message_id");
  },
});

var Rooms = Bookshelf.Collection.extend({
  model: Room
});

module.exports = {
  Room: Bookshelf.model('Room', Room),
  Rooms: Bookshelf.collection('Rooms', Rooms)
}
