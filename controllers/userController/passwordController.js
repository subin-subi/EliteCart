

const getPage = async (req, res)=>{
    try{
        res.render("user/editPassword")
    }catch(err){
        console.log(err)
    }
}

export default {getPage}