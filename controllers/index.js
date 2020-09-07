const router = require('express').Router();

const apiRoutes = require('./api');
const homeRoutes = require('./home-routes.js');
const dashboardRoutes = require('./dashboard-routes');
const renderRoutes = require('./render-routes');

router.use('/', homeRoutes);
router.use('/api', apiRoutes);
// route for dashboard
router.use('/dashboard', dashboardRoutes);
router.use('/', renderRoutes);


module.exports = router;