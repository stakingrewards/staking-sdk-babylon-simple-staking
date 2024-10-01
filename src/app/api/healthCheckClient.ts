import { getNetworkConfig } from "../../config/network.config";
import axios from "axios";

interface HealthCheckResponse {
  data: string;
}

export const fetchHealthCheck = async (): Promise<HealthCheckResponse> => {
  const { babylonApiUrl } = getNetworkConfig();

  const response = await axios.get(
    `${babylonApiUrl}/healthcheck`,
  );
  return response.data;
};
