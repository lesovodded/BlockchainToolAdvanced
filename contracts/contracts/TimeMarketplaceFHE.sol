// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@fhevm/solidity/lib/FHE.sol";

/**
 * @title TimeMarketplaceFHE
 * @dev FHE-enabled Time Marketplace for Sepolia deployment
 * Based on working FHE implementations from spingamefhe
 */
contract TimeMarketplaceFHE is Ownable, ReentrancyGuard {
    
    // ============ STRUCTS ============
    
    struct Offer {
        uint256 id;
        address creator;
        string title;
        string description;
        uint256 publicPrice; // in wei - public price for display
        uint256 duration; // in days
        uint256 slots;
        uint256 availableSlots;
        bool isActive;
        uint256 createdAt;
        uint256 expiresAt;
        
        // FHE encrypted data
        euint32 encryptedPrice;
        euint32 encryptedDuration;
        euint32 encryptedSlots;
    }
    
    struct Purchase {
        uint256 offerId;
        address buyer;
        uint256 slots;
        uint256 totalPrice;
        uint256 timestamp;
    }
    
    // ============ STATE VARIABLES ============
    
    uint256 public nextOfferId = 1;
    uint256 public nextPurchaseId = 1;
    
    mapping(uint256 => Offer) public offers;
    mapping(uint256 => Purchase) public purchases;
    mapping(address => uint256[]) public userOffers;
    mapping(address => uint256[]) public userPurchases;
    
    uint256[] public activeOfferIds;
    
    // Statistics
    uint256 public totalOffersCreated;
    uint256 public totalPurchases;
    uint256 public totalVolume;
    
    // Platform settings
    uint256 public platformFee = 500; // 5% (500/10000)
    address public treasury;
    
    // FHE state
    bool public fheEnabled = false;
    
    // ============ EVENTS ============
    
    event OfferCreated(
        uint256 indexed offerId,
        address indexed creator,
        string title,
        uint256 publicPrice,
        uint256 duration,
        uint256 slots
    );
    
    event OfferPurchased(
        uint256 indexed offerId,
        address indexed buyer,
        uint256 slots,
        uint256 totalPrice,
        uint256 slotsLeft
    );
    
    event OfferDeactivated(uint256 indexed offerId, address indexed creator);
    
    event FHEEnabled(address indexed by, bool enabled);
    
    // ============ CONSTRUCTOR ============
    
    constructor(address _treasury) Ownable(msg.sender) {
        require(_treasury != address(0), "Invalid treasury address");
        treasury = _treasury;
    }
    
    // ============ FHE SETUP ============
    
    /**
     * @dev Enable FHE functionality (only owner)
     */
    function enableFHE() external onlyOwner {
        require(!fheEnabled, "FHE already enabled");
        fheEnabled = true;
        emit FHEEnabled(msg.sender, true);
    }
    
    /**
     * @dev Disable FHE functionality (only owner)
     */
    function disableFHE() external onlyOwner {
        require(fheEnabled, "FHE already disabled");
        fheEnabled = false;
        emit FHEEnabled(msg.sender, false);
    }
    
    // ============ CORE FUNCTIONS ============
    
    /**
     * @dev Create a new time offer with FHE encryption
     * @param _title Offer title
     * @param _description Offer description
     * @param _publicPrice Public price for display
     * @param _duration Duration in days
     * @param _slots Number of available slots
     * @param _encryptedPrice FHE encrypted price
     * @param _encryptedDuration FHE encrypted duration
     * @param _encryptedSlots FHE encrypted slots
     */
    function createOfferWithFHE(
        string memory _title,
        string memory _description,
        uint256 _publicPrice,
        uint256 _duration,
        uint256 _slots,
        euint32 _encryptedPrice,
        euint32 _encryptedDuration,
        euint32 _encryptedSlots
    ) external nonReentrant {
        require(fheEnabled, "FHE is not enabled");
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_description).length > 0, "Description cannot be empty");
        require(_publicPrice > 0, "Price must be greater than 0");
        require(_duration > 0, "Duration must be greater than 0");
        require(_slots > 0, "Slots must be greater than 0");
        
        uint256 offerId = nextOfferId++;
        uint256 currentTime = block.timestamp;
        uint256 expiresAt = currentTime + (_duration * 1 days);
        
        offers[offerId] = Offer({
            id: offerId,
            creator: msg.sender,
            title: _title,
            description: _description,
            publicPrice: _publicPrice,
            duration: _duration,
            slots: _slots,
            availableSlots: _slots,
            isActive: true,
            createdAt: currentTime,
            expiresAt: expiresAt,
            encryptedPrice: _encryptedPrice,
            encryptedDuration: _encryptedDuration,
            encryptedSlots: _encryptedSlots
        });
        
        userOffers[msg.sender].push(offerId);
        activeOfferIds.push(offerId);
        totalOffersCreated++;
        
        emit OfferCreated(offerId, msg.sender, _title, _publicPrice, _duration, _slots);
    }
    
    /**
     * @dev Create a simple offer without FHE (fallback)
     */
    function createOffer(
        string memory _title,
        string memory _description,
        uint256 _price,
        uint256 _duration,
        uint256 _slots
    ) external nonReentrant {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_description).length > 0, "Description cannot be empty");
        require(_price > 0, "Price must be greater than 0");
        require(_duration > 0, "Duration must be greater than 0");
        require(_slots > 0, "Slots must be greater than 0");
        
        uint256 offerId = nextOfferId++;
        uint256 currentTime = block.timestamp;
        uint256 expiresAt = currentTime + (_duration * 1 days);
        
        offers[offerId] = Offer({
            id: offerId,
            creator: msg.sender,
            title: _title,
            description: _description,
            publicPrice: _price,
            duration: _duration,
            slots: _slots,
            availableSlots: _slots,
            isActive: true,
            createdAt: currentTime,
            expiresAt: expiresAt,
            encryptedPrice: FHE.asEuint32(0),
            encryptedDuration: FHE.asEuint32(0),
            encryptedSlots: FHE.asEuint32(0)
        });
        
        userOffers[msg.sender].push(offerId);
        activeOfferIds.push(offerId);
        totalOffersCreated++;
        
        emit OfferCreated(offerId, msg.sender, _title, _price, _duration, _slots);
    }
    
    /**
     * @dev Purchase slots from an offer
     */
    function purchaseOffer(uint256 _offerId, uint256 _slots) external payable nonReentrant {
        require(_offerId > 0 && _offerId < nextOfferId, "Invalid offer ID");
        require(_slots > 0, "Must purchase at least 1 slot");
        
        Offer storage offer = offers[_offerId];
        require(offer.isActive, "Offer is not active");
        require(offer.availableSlots >= _slots, "Not enough slots available");
        require(block.timestamp <= offer.expiresAt, "Offer has expired");
        require(msg.sender != offer.creator, "Cannot purchase your own offer");
        
        uint256 totalPrice = offer.publicPrice * _slots;
        uint256 feeAmount = (totalPrice * platformFee) / 10000;
        uint256 creatorAmount = totalPrice - feeAmount;
        
        require(msg.value >= totalPrice, "Insufficient payment");
        
        // Update offer
        offer.availableSlots -= _slots;
        if (offer.availableSlots == 0) {
            offer.isActive = false;
            _removeFromActiveOffers(_offerId);
        }
        
        // Record purchase
        uint256 purchaseId = nextPurchaseId++;
        purchases[purchaseId] = Purchase({
            offerId: _offerId,
            buyer: msg.sender,
            slots: _slots,
            totalPrice: totalPrice,
            timestamp: block.timestamp
        });
        
        userPurchases[msg.sender].push(purchaseId);
        totalPurchases++;
        totalVolume += totalPrice;
        
        // Transfer funds
        if (feeAmount > 0) {
            (bool feeSuccess, ) = treasury.call{value: feeAmount}("");
            require(feeSuccess, "Fee transfer failed");
        }
        
        (bool creatorSuccess, ) = offer.creator.call{value: creatorAmount}("");
        require(creatorSuccess, "Creator payment failed");
        
        // Refund excess payment
        if (msg.value > totalPrice) {
            (bool refundSuccess, ) = msg.sender.call{value: msg.value - totalPrice}("");
            require(refundSuccess, "Refund failed");
        }
        
        emit OfferPurchased(_offerId, msg.sender, _slots, totalPrice, offer.availableSlots);
    }
    
    // ============ FHE FUNCTIONS ============
    
    /**
     * @dev Perform FHE comparison operations
     */
    function comparePrices(uint256 _offerId1, uint256 _offerId2) external returns (ebool) {
        require(fheEnabled, "FHE is not enabled");
        require(_offerId1 > 0 && _offerId1 < nextOfferId, "Invalid offer ID 1");
        require(_offerId2 > 0 && _offerId2 < nextOfferId, "Invalid offer ID 2");
        
        Offer storage offer1 = offers[_offerId1];
        Offer storage offer2 = offers[_offerId2];
        
        require(offer1.isActive && offer2.isActive, "Offers must be active");
        
        return FHE.gt(offer1.encryptedPrice, offer2.encryptedPrice);
    }
    
    /**
     * @dev Get encrypted offer data
     */
    function getEncryptedOfferData(uint256 _offerId) external view returns (euint32, euint32, euint32) {
        require(fheEnabled, "FHE is not enabled");
        require(_offerId > 0 && _offerId < nextOfferId, "Invalid offer ID");
        
        Offer storage offer = offers[_offerId];
        return (offer.encryptedPrice, offer.encryptedDuration, offer.encryptedSlots);
    }
    
    // ============ UTILITY FUNCTIONS ============
    
    function deactivateOffer(uint256 _offerId) external {
        require(_offerId > 0 && _offerId < nextOfferId, "Invalid offer ID");
        Offer storage offer = offers[_offerId];
        require(msg.sender == offer.creator || msg.sender == owner(), "Not authorized");
        require(offer.isActive, "Offer already inactive");
        
        offer.isActive = false;
        _removeFromActiveOffers(_offerId);
        
        emit OfferDeactivated(_offerId, offer.creator);
    }
    
    function _removeFromActiveOffers(uint256 _offerId) internal {
        for (uint256 i = 0; i < activeOfferIds.length; i++) {
            if (activeOfferIds[i] == _offerId) {
                activeOfferIds[i] = activeOfferIds[activeOfferIds.length - 1];
                activeOfferIds.pop();
                break;
            }
        }
    }
    
    // ============ VIEW FUNCTIONS ============
    
    function getContractStats() external view returns (uint256, uint256, uint256, uint256) {
        return (totalOffersCreated, totalPurchases, totalVolume, activeOfferIds.length);
    }
    
    function getActiveOfferIds() external view returns (uint256[] memory) {
        return activeOfferIds;
    }
    
    function getUserOffers(address _user) external view returns (uint256[] memory) {
        return userOffers[_user];
    }
    
    function getUserPurchases(address _user) external view returns (uint256[] memory) {
        return userPurchases[_user];
    }
    
    function getPlatformFee() external view returns (uint256) {
        return platformFee;
    }
    
    function getTreasury() external view returns (address) {
        return treasury;
    }
    
    function isFHEEnabled() external view returns (bool) {
        return fheEnabled;
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    function updatePlatformFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= 1000, "Fee cannot exceed 10%");
        platformFee = _newFee;
    }
    
    function updateTreasury(address _newTreasury) external onlyOwner {
        require(_newTreasury != address(0), "Invalid treasury address");
        treasury = _newTreasury;
    }
    
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Withdrawal failed");
    }
}
