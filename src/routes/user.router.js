import {Router} from 'express';
import { userRegister,
    userLogin,getUserHistory,userLogout,getUserChannelProfile,
    refreshAccessToken ,getCurrentUser,changePassword,updateUserAvatar,
    updateUserCoverImage,updateAccountDetails} from '../controllers/user.controller.js';
import { upload } from '../middlewares/multer.middleware.js';
import verifyJWT  from '../middlewares/auth.middlewire.js';

const router = Router();

router.route('/register').post(
    
    upload.fields([
        { name: 'avatar', maxCount: 1 },
        { name: 'coverImage', maxCount: 1 }
    ]),
    userRegister
);
    
router.route('/login').post(userLogin);



//Secured route means user must be logged in to access this route. So we will use verifyJWT middleware to check if the user is logged in or not. If the user is not logged in, it will throw an error and the user will not be able to access this route.
router.route('/logout').post(verifyJWT, userLogout); 
router.route('/refresh-token').post(refreshAccessToken);
router.route('/change-password').post(verifyJWT, changePassword);
router.route('/current-user').get(verifyJWT, getCurrentUser);
router.route('/update-account').patch(verifyJWT, updateAccountDetails);
router.route('/avatar').patch(verifyJWT, upload.single('avatar'), updateUserAvatar);
router.route('/cover-image').patch(verifyJWT, upload.single('coverImage'), updateUserCoverImage);
router.route('/c/:username').get(verifyJWT, getUserChannelProfile);
router.route('/history').get(verifyJWT, getUserHistory);

  

export default router;