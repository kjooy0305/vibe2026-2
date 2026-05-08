'use strict';
const AppStore = (function() {
  let state = {
    currentWorldId: null,
    currentWorld: null,
    worlds: [],
    regressionCycle: 0,
    searchScope: 'world', // 'world' | 'all'
    streak: { count: 0, lastDate: null },
  };
  const listeners = {};

  function emit(event, data) {
    (listeners[event] || []).forEach(fn => fn(data));
  }

  function on(event, fn) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(fn);
    return () => { listeners[event] = listeners[event].filter(f => f !== fn); };
  }

  function getState() { return state; }

  function setState(partial) {
    state = Object.assign({}, state, partial);
    emit('state-change', state);
  }

  async function init() {
    // Load settings
    const worldId = await DB.getSetting('currentWorldId', null);
    const worlds = await DB.getAll('worlds');
    const cycle = await DB.getSetting('regressionCycle', 0);

    // Load streak
    const streakData = await DB.get('streak', 'main') || { id: 'main', count: 0, lastDate: null };
    const today = new Date().toDateString();
    if (streakData.lastDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (streakData.lastDate === yesterday.toDateString()) {
        streakData.count = (streakData.count || 0) + 1;
      } else if (streakData.lastDate !== today) {
        streakData.count = 1;
      }
      streakData.lastDate = today;
      await DB.put('streak', streakData);
    }

    let currentWorld = null;
    if (worldId) currentWorld = worlds.find(w => w.id === worldId) || null;
    if (!currentWorld && worlds.length) currentWorld = worlds[0];

    setState({
      worlds,
      currentWorldId: currentWorld ? currentWorld.id : null,
      currentWorld,
      regressionCycle: cycle,
      streak: streakData,
    });

    emit('ready', state);
  }

  async function setCurrentWorld(worldId) {
    const worlds = await DB.getAll('worlds');
    const world = worlds.find(w => w.id === worldId) || null;
    await DB.setSetting('currentWorldId', worldId);
    setState({ currentWorldId: worldId, currentWorld: world, worlds });
    emit('world-changed', world);
  }

  async function refreshWorlds() {
    const worlds = await DB.getAll('worlds');
    setState({ worlds });
    return worlds;
  }

  function getCurrentWorldId() {
    return state.currentWorldId;
  }

  async function updateStreak() {
    const today = new Date().toDateString();
    const streakData = await DB.get('streak', 'main') || { id: 'main', count: 0, lastDate: null };
    if (streakData.lastDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (streakData.lastDate === yesterday.toDateString()) {
        streakData.count = (streakData.count || 0) + 1;
      } else {
        streakData.count = 1;
      }
      streakData.lastDate = today;
      await DB.put('streak', streakData);
      setState({ streak: streakData });
    }
    return streakData;
  }

  return { init, on, emit, getState, setState, setCurrentWorld, refreshWorlds, getCurrentWorldId, updateStreak };
})();
window.AppStore = AppStore;
