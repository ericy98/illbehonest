const express = require("express")
const router = express.Router()
const db = require("../models")
const { Router } = require("express")

router.get("/", (req, res) => {
    res.render("index")
})

router.get("/images", (req, res) => {
    db.Image.findAll({}).then(image => {
        res.render("images", { images: image })
    })
})
module.exports = router;