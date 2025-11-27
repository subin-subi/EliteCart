

const getChat = (req, res)=>{
    res.render("user/chat",{
        user : req.session.user || null
    })
}

export default ({
    getChat
})