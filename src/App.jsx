import { Box, Button, Center, Flex, Heading, Image, Input, SimpleGrid, Spinner, Text } from '@chakra-ui/react';
import { Alchemy, Network, Utils } from 'alchemy-sdk';
import { useState, useEffect } from 'react';


// Load environment variables from .env file



function App() {
  const [userAddress, setUserAddress] = useState('');
  const [results, setResults] = useState([]);
  const [hasQueried, setHasQueried] = useState(false);
  const [tokenDataObjects, setTokenDataObjects] = useState([]);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cachedTokenMetadata, setCachedTokenMetadata] = useState({});

  useEffect(() => {
    // Fetch cached token metadata from local storage on component mount
    const cachedData = localStorage.getItem('cachedTokenMetadata');
    if (cachedData) {
      setCachedTokenMetadata(JSON.parse(cachedData));
    }
  }, []);

  async function connectWallet() {
    try {
      setIsConnectingWallet(true);
      // Request access to MetaMask
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      // Get the first account address
      setUserAddress(accounts[0]);
    } catch (error) {
      console.error('Error connecting to wallet:', error);
    } finally {
      setIsConnectingWallet(false);
    }
  }

  async function getTokenBalance() {
    setIsLoading(true);
    setError(null); // Clear previous errors
    try {
      let address = userAddress;
      console.log('Fetching token balances for address:', address);

      const config = {
        apiKey: process.env.API_KEY,
        network: Network.ETH_MAINNET,
      };

      const alchemy = new Alchemy(config);
      const data = await alchemy.core.getTokenBalances(address);

      setResults(data);

      const tokenDataPromises = [];

      for (let i = 0; i < data.tokenBalances.length; i++) {
        const contractAddress = data.tokenBalances[i].contractAddress;
        // Check if token metadata is already cached
        if (cachedTokenMetadata[contractAddress]) {
          tokenDataPromises.push(cachedTokenMetadata[contractAddress]);
        } else {
          const tokenData = alchemy.core.getTokenMetadata(contractAddress);
          tokenDataPromises.push(tokenData);
          // Cache token metadata
          setCachedTokenMetadata((prevData) => ({
            ...prevData,
            [contractAddress]: tokenData,
          }));
        }
      }

      setTokenDataObjects(await Promise.all(tokenDataPromises));
      setHasQueried(true);
    } catch (error) {
      console.error('Error fetching token balances:', error);
      setError('An error occurred while fetching token balances. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  // Function to truncate long token balances
  function truncateBalance(balance) {
    const maxLength = 10; // Maximum length of displayed balance
    if (balance.length > maxLength) {
      return balance.substring(0, maxLength) + '...';
    } else {
      return balance;
    }
  }

  return (
    <Box w="100vw" bg="orange.200" p={8}>
      <Center>
        <Flex alignItems={'center'} justifyContent="center" flexDirection={'column'}>
          <Heading mb={0} fontSize={36} color="blue.500">
            ERC-20 Token Indexer
          </Heading>
          <Text color="gray.600" fontSize="lg">
            Plug in an address and this website will return all of its ERC-20 token balances!
          </Text>
        </Flex>
      </Center>
      <Flex w="100%" flexDirection="column" alignItems="center" justifyContent={'center'} mt={8}>
        <Heading fontSize="xl" fontWeight="semibold" textAlign="center" mb={4}>
          Get all the ERC-20 token balances of this address:
        </Heading>
        <Flex flexDirection="column" alignItems="center">
          {!userAddress && (
            <Button
              fontSize="lg"
              onClick={connectWallet}
              isLoading={isConnectingWallet}
              colorScheme="orange"
              my={4}
            >
              Connect Wallet
            </Button>
          )}
          <Input
            value={userAddress}
            onChange={(e) => setUserAddress(e.target.value)}
            color="black"
            w="600px"
            textAlign="center"
            p={4}
            bgColor="white"
            fontSize="xl"
            my={4}
            placeholder="Enter Ethereum address or ENS"
          />
          <Button
            fontSize="lg"
            onClick={getTokenBalance}
            mt={userAddress ? 2 : 4}
            colorScheme="orange"
            disabled={!userAddress}
          >
            Check ERC-20 Token Balances
          </Button>
          {isLoading && <Spinner mt={2} />}
        </Flex>

        {error && (
          <Text color="red.500" textAlign="center" mt={4}>
            {error}
          </Text>
        )}

        <Heading fontSize="xl" fontWeight="semibold" textAlign="center" my={8}>
          ERC-20 token balances:
        </Heading>

        {hasQueried ? (
          <SimpleGrid w="90vw" columns={{ base: 1, sm: 2, md: 4 }} spacing={8} justifyContent="center">
            {results.tokenBalances.map((e, i) => {
              return (
                <Flex flexDir="column" bg="orange.300" p={4} borderRadius="md" key={e.id} maxW="250px" textAlign="center">
                  <Box>
                    <b>Symbol:</b> ${tokenDataObjects[i].symbol}&nbsp;
                  </Box>
                  <Box>
                    <b>Balance:</b>&nbsp;
                    {truncateBalance(
                      Utils.formatUnits(
                        e.tokenBalance,
                        tokenDataObjects[i].decimals
                      )
                    )}
                  </Box>
                  <Image src={tokenDataObjects[i].logo} alt={tokenDataObjects[i].symbol} w={32} h={32} mx="auto" my={4} />
                </Flex>
              );
            })}
          </SimpleGrid>
        ) : (
          <Text textAlign="center">Please make a query! This may take a few seconds...</Text>
        )}
      </Flex>
    </Box>
  );
}

export default App;
