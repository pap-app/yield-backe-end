// controllers/walletController.ts
import expressAsyncHandler from 'express-async-handler';

export const getBalances = expressAsyncHandler(async (req, res) => {
  const { walletId } = req.params;
  const { assets } = req.query; // optional, e.g., assets=USDC,EURC

  if (!walletId) {
    res.status(400).json({ message: 'Missing walletId in request params.' });
  }

  const url = `https://horizon.stellar.org/accounts/${walletId}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      res.status(400).json({ message: 'Invalid wallet ID or Horizon error.' });
    }

    const data = await response.json();
    let balances = data.balances;

    if (assets) {
      const assetList = String(assets)
        .split(',')
        .map((a) => a.trim().toUpperCase());
      balances = balances.filter((b) => {
        if (b.asset_type === 'native') {
          return assetList.includes('XLM');
        }
        return assetList.includes(b.asset_code?.toUpperCase());
      });
    }

    res.status(200).json({
      wallet: walletId,
      balances,
    });
  } catch (err) {
    console.error('Error fetching balances:', err);
    res.status(500).json({ message: 'Failed to fetch wallet balances.' });
  }
});

export const getPortfolio = expressAsyncHandler(async (req, res) => {
  const { walletId } = req.params;
  const { asset } = req.query;

  if (!walletId) {
    res.status(400).json({ message: 'Missing walletId parameter' });
  }

  const url = `https://horizon.stellar.org/accounts/${walletId}`;
  const response = await fetch(url);
  const data = await response.json();

  if (!data.balances) {
    res.status(404).json({ message: 'Unable to fetch balances' });
  }

  let balances = data.balances;

  // Optional filtering
  if (asset) {
    balances = balances.filter((b: any) => b.asset_code === asset);
  }

  const portfolio = balances.map((balance: any, i: number) => ({
    id: `portfolio-${i + 1}`,
    assetType: balance.asset_type,
    asset: balance.asset_code || 'XLM',
    balance: balance.balance,
    totalValue: Number(balance.balance) * 1.0, // mock
    currentAPY: '8.1',
    earningPercentage: '47.0',
    growth: '12929.00',
    dailyChange: '12929.00',
    dailyChangePercent: '9.7',
    monthlyEarnings: '1683.00',
  }));

  res.status(200).json({
    wallet: walletId,
    portfolio,
  });
});
