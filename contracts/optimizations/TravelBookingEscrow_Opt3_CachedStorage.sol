// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Optimization 3 (on top of Step 2): Cache repeated storage reads into local variables.
// Each SLOAD costs ~2100 gas; local variable reads cost only 3 gas.
contract TravelBookingEscrow_Step3_CachedStorage {
    address public immutable owner;

    uint256 public bookingCount;

    enum BookingStatus { Pending, Completed, Cancelled }

    struct Booking {
        uint256 id;
        address traveler;
        address provider;
        uint256 amount;
        BookingStatus status;
        uint256 createdAt;
    }

    mapping(uint256 => Booking) public bookings;

    error ZeroDeposit();
    error InvalidProvider();
    error SelfBooking();
    error BookingNotFound();
    error BookingNotPending();
    error NotTraveler();
    error NotAuthorized();

    event BookingCreated(
        uint256 indexed bookingId,
        address indexed traveler,
        address indexed provider,
        uint256 amount
    );
    event BookingCompleted(uint256 indexed bookingId, address indexed provider, uint256 amount);
    event BookingCancelled(uint256 indexed bookingId, address indexed traveler, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    function createBooking(address provider) external payable {
        if (msg.value == 0) revert ZeroDeposit();
        if (provider == address(0)) revert InvalidProvider();
        if (provider == msg.sender) revert SelfBooking();

        uint256 _bookingCount = bookingCount + 1;  // <-- cached and incremented locally
        bookingCount = _bookingCount;               // <-- single SSTORE

        bookings[_bookingCount] = Booking({
            id: _bookingCount,
            traveler: msg.sender,
            provider: provider,
            amount: msg.value,
            status: BookingStatus.Pending,
            createdAt: block.timestamp
        });

        emit BookingCreated(_bookingCount, msg.sender, provider, msg.value);
    }

    function confirmCompletion(uint256 bookingId) external {
        Booking storage booking = bookings[bookingId];

        // Cache storage reads into locals
        uint256 _id = booking.id;               // <-- cached
        address _traveler = booking.traveler;    // <-- cached
        address _provider = booking.provider;    // <-- cached
        uint256 _amount = booking.amount;        // <-- cached

        if (_id == 0) revert BookingNotFound();
        if (booking.status != BookingStatus.Pending) revert BookingNotPending();
        if (msg.sender != _traveler) revert NotTraveler();

        booking.status = BookingStatus.Completed;
        payable(_provider).transfer(_amount);

        emit BookingCompleted(bookingId, _provider, _amount);
    }

    function cancelBooking(uint256 bookingId) external {
        Booking storage booking = bookings[bookingId];

        // Cache storage reads into locals
        uint256 _id = booking.id;               // <-- cached
        address _traveler = booking.traveler;    // <-- cached
        uint256 _amount = booking.amount;        // <-- cached

        if (_id == 0) revert BookingNotFound();
        if (booking.status != BookingStatus.Pending) revert BookingNotPending();
        if (msg.sender != _traveler && msg.sender != owner) revert NotAuthorized();

        booking.status = BookingStatus.Cancelled;
        payable(_traveler).transfer(_amount);

        emit BookingCancelled(bookingId, _traveler, _amount);
    }

    function getBookingDetails(uint256 bookingId)
        external
        view
        returns (Booking memory)
    {
        if (bookings[bookingId].id == 0) revert BookingNotFound();
        return bookings[bookingId];
    }

    function getBookingCount() external view returns (uint256) {
        return bookingCount;
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
