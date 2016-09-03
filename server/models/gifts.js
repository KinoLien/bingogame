
var Bookshelf = require('./base');

var Gift = Bookshelf.Model.extend({
  tableName: "gifts",
  
  // room: function () {
  //   // one-to-one or many-to-one
  //   return this.belongsTo('Room', "room_id");
  // },
  // domainuser: function () {
  //   // one-to-one or many-to-one
  //   return this.belongsTo('Domainuser', "domainuser_id");
  // },
  players: function () {
    // one-to-many
    return this.hasMany('Player');
  }
});

var Gifts = Bookshelf.Collection.extend({
  model: Gift
});

module.exports = {
  Gift: Bookshelf.model('Gift', Gift),
  Gifts: Bookshelf.collection('Gifts', Gifts)
}
