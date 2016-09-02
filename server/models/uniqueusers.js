
var Bookshelf = require('./base');

var Uniqueuser = Bookshelf.Model.extend({
  tableName: "uniqueusers",
  hasTimestamps : true,

  domainusers: function () {
    // one-to-many
    return this.hasMany(Domainuser);
  },
});

var Uniqueusers = Bookshelf.Collection.extend({
  model: Uniqueuser
});

module.exports = {
  Uniqueuser: Bookshelf.model('Uniqueuser', Uniqueuser),
  Uniqueusers: Bookshelf.collection('Uniqueusers', Uniqueusers)
}
