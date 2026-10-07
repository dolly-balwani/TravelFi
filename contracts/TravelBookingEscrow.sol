// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TravelBookingEscrow
 * @notice A decentralized travel booking escrow contract.
 *         Travelers deposit ETH into escrow when booking a trip.
 *         Funds are released to the travel provider on trip completion,
 *         or refunded to the traveler on cancellation.
 */
contract TravelBookingEscrow {
    address public owner;
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

    event BookingCreated(
        uint256 indexed bookingId,
        address indexed traveler,
        address indexed provider,
        uint256 amount
    );
    event BookingCompleted(uint256 indexed bookingId, address indexed provider, uint256 amount);
    event BookingCancelled(uint256 indexed bookingId, address indexed traveler, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the contract owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Create a booking and deposit ETH into escrow.
     * @param provider The address of the travel provider (hotel, airline, etc.)
     */
    function createBooking(address provider) external payable {
        require(msg.value > 0, "Deposit must be greater than 0");
        require(provider != address(0), "Invalid provider address");
        require(provider != msg.sender, "Cannot book with yourself");

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

    /**
     * @notice Confirm trip completion — releases escrowed funds to the provider.
     * @param bookingId The ID of the booking to confirm.
     */
    function confirmCompletion(uint256 bookingId) external {
        Booking storage booking = bookings[bookingId];
        require(booking.id != 0, "Booking does not exist");
        require(booking.status == BookingStatus.Pending, "Booking is not pending");
        require(
            msg.sender == booking.traveler,
            "Only the traveler can confirm completion"
        );

        booking.status = BookingStatus.Completed;
        payable(booking.provider).transfer(booking.amount);

        emit BookingCompleted(bookingId, booking.provider, booking.amount);
    }

    /**
     * @notice Cancel a booking — refunds escrowed funds to the traveler.
     * @param bookingId The ID of the booking to cancel.
     */
    function cancelBooking(uint256 bookingId) external {
        Booking storage booking = bookings[bookingId];
        require(booking.id != 0, "Booking does not exist");
        require(booking.status == BookingStatus.Pending, "Booking is not pending");
        require(
            msg.sender == booking.traveler || msg.sender == owner,
            "Only traveler or owner can cancel"
        );

        booking.status = BookingStatus.Cancelled;
        payable(booking.traveler).transfer(booking.amount);

        emit BookingCancelled(bookingId, booking.traveler, booking.amount);
    }

    /**
     * @notice Get the details of a booking.
     * @param bookingId The ID of the booking.
     * @return The Booking struct.
     */
    function getBookingDetails(uint256 bookingId)
        external
        view
        returns (Booking memory)
    {
        require(bookings[bookingId].id != 0, "Booking does not exist");
        return bookings[bookingId];
    }

    /**
     * @notice Get the total number of bookings created.
     * @return The booking count.
     */
    function getBookingCount() external view returns (uint256) {
        return bookingCount;
    }

    /**
     * @notice Get the contract's ETH balance (total escrowed funds).
     * @return The contract balance in wei.
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
