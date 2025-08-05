import express from 'express';
import { generateTgLinkAuth } from '../controller/generateTgAuthLink';
import { registerStrategy } from '../controller/strategies';
import { getVaults, registerVault } from '../controller/vaults';
import { getBalances, getPortfolio } from '../controller/fetchBalnces';

const router = express.Router();

router.route('/create').post(registerVault);
router.route('/').get(getVaults);

router.route('/generate-link').post(generateTgLinkAuth);
router.route('/balances/:walletId').get(getBalances);
router.route('/portfolio/:walletId').get(getPortfolio);

export default router;
