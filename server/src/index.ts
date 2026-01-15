import app from './app';
import { config } from './config';

app.listen(config.port, () => {
  console.log(`Timekeep API listening on port ${config.port}`);
});
