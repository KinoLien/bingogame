
var Bookshelf = require('./base');

var Message = Bookshelf.Model.extend({
  tableName: "messages",
  hasTimestamps : true,
  room: function () {
    // one-to-one or many-to-one
    return this.belongsTo('Room', "room_id");
  },
  domainuser: function () {
    // one-to-one or many-to-one
    return this.belongsTo('Domainuser', "domainuser_id");
  },
});

var Messages = Bookshelf.Collection.extend({
  model: Message
});

module.exports = {
  Message: Bookshelf.model('Message', Message),
  Messages: Bookshelf.collection('Messages', Messages)
}
