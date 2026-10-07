// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Optimization 2 (on top of Step 1): require(string) -> custom errors.
// Custom errors use less gas than string-based require messages because
// they are encoded as 4-byte selectors instead of storing full strings.
contract TravelBookingEscrow_Step2_CustomErrors {
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

    // Custom errors — cheaper than require(string)
    error ZeroDeposit();             // <-- new
    error InvalidProvider();         // <-- new
    error SelfBooking();             // <-- new
    error BookingNotFound();         // <-- new
    error BookingNotPending();       // <-- new
    error NotTraveler();             // <-- new
    error NotAuthorized();           // <-- new

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

        bookingCount++;
        bookings[bookingCount] = Booking({
            id: bookingCount,
            traveler: msg.sender,
            provider: provider,
            amount: msg.value,
            status: BookingStatus.Pending,
            createdAt: block.timestamp
        });

        emit BookingCreated(bookingCount, msg.sender, provider, msg.value);
    }

    function confirmCompletion(uint256 bookingId) external {
        Booking storage booking = bookings[bookingId];
        if (booking.id == 0) revert BookingNotFound();
        if (booking.status != BookingStatus.Pending) revert BookingNotPending();
        if (msg.sender != booking.traveler) revert NotTraveler();

        booking.status = BookingStatus.Completed;
        payable(booking.provider).transfer(booking.amount);

        emit BookingCompleted(bookingId, booking.provider, booking.amount);
    }

    function cancelBooking(uint256 bookingId) external {
        Booking storage booking = bookings[bookingId];
        if (booking.id == 0) revert BookingNotFound();
        if (booking.status != BookingStatus.Pending) revert BookingNotPending();
        if (msg.sender != booking.traveler && msg.sender != owner) revert NotAuthorized();

        booking.status = BookingStatus.Cancelled;
        payable(booking.traveler).transfer(booking.amount);

        emit BookingCancelled(bookingId, booking.traveler, booking.amount);
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
