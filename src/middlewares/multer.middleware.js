import multer from "multer"

const storage = multer.diskStorage({   // MULTER GIVES AN EXTRA ACCESS OF FILE INSIDE FUNcTION 
    destination: function (req, file, cb) {
      cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)
    }
  })
  
export const upload = multer({ 
    storage,
})