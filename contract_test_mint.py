from utils.config import load_config
from utils.config import setup_custom_logger
from utils.contract import connect_to_web3
from utils.contract import load_contract
from utils.transact import mint_ring


def main():
    """The main function to mint and NFT."""

    # Load config and setup logger
    config = load_config('config.ini')
    logger = setup_custom_logger()

    # Connect to web3
    w3, status = connect_to_web3(network=config['network']['network'],
                                 api_key=config['network']['api_key'])
    private_key = config['account']['private_key']
    address = config['account']['address']

    if status:
        connection_msg = 'Web3 connection successful!'
        print(f'[INFO] {connection_msg}')
        logger.info(connection_msg)

        # Load the contract
        contract = load_contract(w3, config['contract']['address'],
                                 config['contract']['abi'])

        # Get vault address
        vault_address = contract.functions.vault().call()
        print(f'[INFO] Vault address: {vault_address}')

        # Get rings available before mint
        rings_available = contract.functions.getAvailableRings().call()
        print(f'[INFO] Rings available: {rings_available}')

        # Verify the ring price before mint
        ring_price = contract.functions.getRingPrice().call()
        print(f'[INFO] Ring price: {ring_price}')

        # Mint a ring
        txn_receipt = mint_ring(w3, contract, private_key, address, ring_price)
        print(f'[INFO] Transaction receipt: {txn_receipt}')

        # Get rings available after mint
        rings_available = contract.functions.getAvailableRings().call()
        print(f'[INFO] Rings available: {rings_available}')


if __name__ == '__main__':
    main()
