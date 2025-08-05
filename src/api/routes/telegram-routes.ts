import express from 'express';
import { verifyTelegramAuth } from '../controller/verifyTelegram';
import { generateTgLinkAuth } from '../controller/generateTgAuthLink';

const router = express.Router();

router.route('/verify').post(verifyTelegramAuth);
router.route('/generate-link').post(generateTgLinkAuth);

export default router;
