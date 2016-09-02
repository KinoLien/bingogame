
var Bookshelf = require('./base');

var Domainuser = Bookshelf.Model.extend({
  tableName: "domainusers",
  hasTimestamps : true,
  domain: function () {
    // one-to-one or many-to-one
    return this.belongsTo('Domain', "domain_id");
  },
  uniqueuser: function () {
    // one-to-one or many-to-one
    return this.belongsTo('Uniqueuser', "uniqueuser_id");
  },
});

var Domainusers = Bookshelf.Collection.extend({
  model: Domainuser
});

module.exports = {
  Domainuser: Bookshelf.model('Domainuser', Domainuser),
  Domainusers: Bookshelf.collection('Domainusers', Domainusers)
}
