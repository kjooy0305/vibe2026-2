'use strict';

/**
 * Global app constants — editable via 템플릿 관리 > 전역 상수.
 * Call AppConstants.load() once per page init to get resolved values.
 * Call AppConstants.invalidate() after saving constants in templates page.
 */
window.AppConstants = {
  _cache: null,

  DEFAULTS: {
    grades:              ['F','E','D','C','B','A','S','SS','SSS','G','GG','GGG','EX'],
    attributes:          ['없음','화염','물','땅','바람','뇨','성화','청화','백화','빙화','빙','흑뢰','적뢰','공간','이능','신성','타락'],
    skillSeries:         ['없음','공격','방어','치료','계약-처벌','계약-심판','계약-처행','종족 스킬'],
    skillTypes:          ['패시브','액티브'],
    passiveSubtypes:     ['강화-스텟','강화-스킬','자동반사','억제-광역','억제-단일','반격'],
    activeSubtypes:      ['변형','일반-공격','일반-방어','일반-서포트','캐스팅-즉발','캐스팅-필요'],
    skillSubtypes:       ['상급','하급','응용','진화','융합'],
    itemTypes:           ['무기','방어구','소비','재료','특수','탑전용','장신구','공성병기','수성병기','기타'],
    jobSeries:           ['근접','원거리','서포트','후방 지원','전략','올라운더'],
    baseStats:           ['힘','민첩','체력'],
    constellationSeries: ['멸망성좌','타락성좌','일반성좌','성운성좌','은하성좌'],
    constellationTiers:  ['절대신(개념신)','최상급(업적신)','중급(숭배신)','하급(반신)'],
    govTypes:            ['민주주의','군주제','제정','연방제','전체주의','공화국','신정국가','과두제','기타'],
    econTypes:           ['자본주의','사회주의','공산주의','혼합경제','계획경제','봉건경제','기타'],
    militaryLevels:      ['최강','강','중','약','최약','미상'],
    iconPresets:         ['⭐','🌟','💫','✨','🔥','❄️','⚡','🌊','🌪️','🌑','☀️','🌙','🌌','👁️','⚔️','🐉','🦋','🔱','👑','💀','🌸','🗡️','🌈','🌀','🏆','🎭','🌺','🦅','🐺','🦁','🌿','🍄','🦊','🐦','🌺','💎','🔮','🪄','🧿','⚙️','🌍','🌋','🏔️','🗺️','🌅','🎯','🎪','🃏','🎭','🔑','⚓','🛡️','🗿','🧲','🌐'],
  },

  async load() {
    if (this._cache) return this._cache;
    const keys = Object.keys(this.DEFAULTS);
    const results = await Promise.all(keys.map(k => DB.getSetting('const_' + k, null)));
    this._cache = {};
    keys.forEach((k, i) => { this._cache[k] = results[i] || this.DEFAULTS[k]; });
    return this._cache;
  },

  invalidate() {
    this._cache = null;
  },
};
