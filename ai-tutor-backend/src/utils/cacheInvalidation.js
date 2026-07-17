function clearAdminOverviewCache() {
  try {
    require('../routes/admin').clearOverviewCache?.();
  } catch {}
}

module.exports = { clearAdminOverviewCache };
