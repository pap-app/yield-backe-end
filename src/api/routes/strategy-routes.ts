import express from 'express';
import { verifyTelegramAuth } from '../controller/verifyTelegram';
import { generateTgLinkAuth } from '../controller/generateTgAuthLink';
import { registerStrategy } from '../controller/strategies';

const router = express.Router();

router.route('/create').post(registerStrategy);
router.route('/generate-link').post(generateTgLinkAuth);

export default router;
