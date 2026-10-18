/** Each focus's starter kit (Appendix B §4): acolyte, melee, ranged and spell, by skill ID. */
export const FOCUSES: Readonly<Record<string, readonly string[]>> = {
  warrior: [
    "MvM/Heroes/EzomyteAcolyte",
    "Metadata/Items/Gems/SkillGemRollingSlam",
    "Metadata/Items/Gem/SkillGemArmourPiercingRounds",
    "Metadata/Items/Gems/SkillGemEarthquake",
  ],
  ranger: [
    "MvM/Heroes/EzomyteAcolyte",
    "Metadata/Items/Gems/SkillGemFallingThunder",
    "Metadata/Items/Gems/SkillGemLightningArrow",
    "Metadata/Items/Gem/SkillGemExplosiveGrenade",
  ],
  sorceress: [
    "MvM/Heroes/EzomyteAcolyte",
    "Metadata/Items/Gems/SkillGemIceStrike",
    "Metadata/Items/Gems/SkillGemSpark",
    "Metadata/Items/Gems/SkillGemComet",
  ],
};
