var express = require("express");
var path = require("path");

var router = express.Router();

var index = path.join(__dirname, "views", "index.ejs");
var views = path.join(path.dirname(require.main.filename), "views");

router.get("/", function(req, res) {
	res.render(index, {
		title: "Fox in the Forest",
		views: views
	});
});

router.use(express.static(path.join(__dirname, "public")));

module.exports = router;
