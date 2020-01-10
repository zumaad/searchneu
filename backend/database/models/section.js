import _ from 'lodash';

module.exports = (sequelize, DataTypes) => {
  const Section = sequelize.define('Section', {
    id: {
      allowNull: false,
      autoIncrement: false,
      primaryKey: true,
      type: DataTypes.STRING,
    },
    seatsCapacity: DataTypes.INTEGER,
    seatsRemaining: DataTypes.INTEGER,
    waitCapacity: DataTypes.INTEGER,
    waitRemaining: DataTypes.INTEGER,
    online: DataTypes.BOOLEAN,
    honors: DataTypes.BOOLEAN,
    url: DataTypes.STRING,
    crn: DataTypes.STRING,
    meetings: DataTypes.JSON,
    info: DataTypes.TEXT,
  });

  Section.associate = (models) => {
    Section.belongsTo(models.Course, {
      hooks: true,
      foreignKey: {
        name: 'classHash',
        type: DataTypes.STRING,
        references: 'Courses',
        referencesKey: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    Section.belongsToMany(models.User, {
      through: 'FollowedSection',
      as: 'followers',
      foreignKey: 'sectionId',
    });
  };

  Section.prototype.toJSON = function() {
    const obj = this.dataValues;
    return _(obj).omit(['id', 'createdAt', 'updatedAt', 'classHash']).omitBy(_.isNil).value();
  };

  return Section;
};
