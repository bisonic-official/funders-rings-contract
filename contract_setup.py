from utils.config import load_config
from utils.config import setup_custom_logger
from utils.contract import connect_to_web3
from utils.contract import load_contract
from utils.transact import set_ring_price
from utils.transact import set_vault_address


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

        # Get vault address before setup
        vault_address = contract.functions.vault().call()
        print(f'[INFO] Vault address: {vault_address}')

        # # Set the vault address
        # vault_address = config['account']['address']
        # txn_receipt = set_vault_address(w3, contract, private_key, address,
        #                                 vault_address)
        # txn_msg = f'Transaction receipt (setVaultAddress): {txn_receipt}'
        # print(f'[INFO] {txn_msg}')

        # # Get vault address after setup
        # vault_address = contract.functions.vault().call()
        # print(f'[INFO] Vault address: {vault_address}')

        # Get rings available to mint
        rings_available = contract.functions.getAvailableRings().call()
        print(f'[INFO] Rings available: {rings_available}')

        # Verify the ring price before setup
        ring_price = contract.functions.getRingPrice().call()
        print(f'[INFO] Ring price: {ring_price}')

        # # Set the ring price
        # ring_price = 1_000_000_000_000_000
        # txn_receipt = set_ring_price(w3, contract, private_key, address,
        #                              ring_price)
        # txn_msg = f'Transaction receipt (setPrice): {txn_receipt}'
        # print(f'[INFO] {txn_msg}')

        # # Verify the ring price after setup
        # ring_price = contract.functions.getRingPrice().call()
        # print(f'[INFO] Ring price: {ring_price}')


if __name__ == '__main__':
    main()
